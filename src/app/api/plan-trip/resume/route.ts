import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { compiledGraph } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resumeSchema = z.object({
  threadId: z.string().min(1, "threadId is required"),
  approved: z.boolean(),
  draft: z.array(z.any()).optional(),
  feedback: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session", code: "SESSION_ERROR" },
        { status: 500 }
      );
    }

    // 2. Validate request body
    const body = await req.json();
    const result = resumeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", code: "BAD_REQUEST", details: result.error.format() },
        { status: 400 }
      );
    }

    const { threadId, approved, draft, feedback } = result.data;

    // 3. Fetch current graph state
    const state = await compiledGraph.getState({ configurable: { thread_id: threadId } });
    if (!state.values || Object.keys(state.values).length === 0) {
      return NextResponse.json(
        { error: "Session or itinerary draft not found. Please try again.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4. Handle Approval
    if (approved) {
      const finalDraft = draft || state.values.draft;
      if (!finalDraft || !Array.isArray(finalDraft)) {
        return NextResponse.json(
          { error: "Draft itinerary is missing or invalid", code: "INVALID_DRAFT" },
          { status: 400 }
        );
      }

      // Calculate totalEstimatedCost from the dailyEstimate sum of each day
      const totalEstimatedCost = finalDraft.reduce((sum: number, day: any) => {
        return sum + (Number(day.dailyEstimate) || 0);
      }, 0);

      // Save finalized Trip to the database
      const trip = await prisma.trip.create({
        data: {
          userId,
          destination: state.values.destination,
          budget: Number(state.values.budget),
          currency: state.values.currency || "INR",
          startDate: new Date(state.values.startDate),
          endDate: new Date(state.values.endDate),
          preferences: state.values.preferences || null,
          itinerary: JSON.stringify(finalDraft),
          status: "FINALIZED",
          totalEstimatedCost,
        },
      });

      return NextResponse.json({
        tripId: trip.id,
        status: "FINALIZED",
      });
    }

    // 5. Handle Revision (approved = false)
    // Inject human feedback into state and resume graph execution as SSE stream
    if (!feedback || feedback.trim() === "") {
      return NextResponse.json(
        { error: "Feedback is required to request changes", code: "FEEDBACK_REQUIRED" },
        { status: 400 }
      );
    }

    // Update state with human feedback
    await compiledGraph.updateState(
      { configurable: { thread_id: threadId } },
      { humanFeedback: feedback }
    );

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("Error enqueuing resume SSE event:", e);
          }
        };

        try {
          sendEvent({ type: "agent_log", message: `[system] Resuming itinerary planning with feedback: "${feedback}"`, threadId });

          // Resume the graph stream (passing null runs from current checkpoint)
          const eventStream = await compiledGraph.stream(null, {
            configurable: { thread_id: threadId },
            recursionLimit: 50,
          });

          for await (const chunk of eventStream) {
            const typedChunk = chunk as Record<string, any>;
            for (const nodeName of Object.keys(typedChunk)) {
              const nodeOutput = typedChunk[nodeName];
              if (nodeOutput && Array.isArray(nodeOutput.logs)) {
                for (const log of nodeOutput.logs) {
                  sendEvent({ type: "agent_log", message: log, threadId });
                }
              }
            }
          }

          // Fetch the state again after execution has paused/completed
          const finalState = await compiledGraph.getState({ configurable: { thread_id: threadId } });
          if (finalState.next && finalState.next.includes("humanReview")) {
            const newDraft = finalState.values.draft;
            sendEvent({ type: "draft_ready", draft: newDraft, threadId });
          } else {
            sendEvent({ type: "error", message: "Graph execution terminated unexpectedly without generating a revised draft." });
          }

        } catch (error: any) {
          console.error("SSE Resume stream execution error:", error);
          sendEvent({ type: "error", message: error.message || "An unexpected error occurred during execution." });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in plan-trip resume route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
