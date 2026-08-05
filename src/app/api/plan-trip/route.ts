import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { compiledGraph } from "@/lib/agent";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const requestSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive("Budget must be greater than 0"),
  currency: z.string().default("INR"),
  preferences: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate parameters
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.format() },
        { status: 400 }
      );
    }

    const { origin, destination, startDate, endDate, budget, currency, preferences } = result.data;

    // Check that startDate is before endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (start >= end) {
      return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
    }

    // 3. Generate a unique thread ID for the LangGraph checkpointer
    const threadId = uuidv4();

    // 4. Create an SSE stream
    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("Error enqueuing SSE event:", e);
          }
        };

        try {
          // Initialize state for the new graph run
          const initialState = {
            origin,
            destination,
            startDate,
            endDate,
            budget,
            currency,
            preferences,
            logs: ["Starting Wanderlust AI planning pipeline..."],
            workersComplete: [],
          };

          // Stream the graph steps
          const eventStream = await compiledGraph.stream(initialState, {
            configurable: { thread_id: threadId },
            recursionLimit: 50,
          });

          for await (const chunk of eventStream) {
            // Check for worker logs updates and stream them immediately
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

          // Fetch the final state after the graph has paused (interruptBefore humanReview)
          const finalState = await compiledGraph.getState({
            configurable: { thread_id: threadId },
          });

          if (finalState.next && finalState.next.includes("humanReview")) {
            const draft = finalState.values.draft;
            if (!draft || !Array.isArray(draft) || draft.length === 0) {
              sendEvent({ type: "error", message: "The AI failed to generate an itinerary draft. This is usually caused by a temporary API rate limit. Please click 'Try Again' in a few seconds." });
            } else {
              sendEvent({ type: "draft_ready", draft, threadId });
            }
          } else {
            sendEvent({ type: "error", message: "Graph execution terminated unexpectedly without creating a draft." });
          }

        } catch (error: any) {
          console.error("SSE Stream execution error:", error);
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
    console.error("Error initializing plan-trip SSE route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
