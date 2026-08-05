import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TripStateAnnotation } from "./state";
import { IDay } from "./types";
import { tavilySearch } from "./tools";
import { z } from "zod";

// Helper to call Gemini as a fallback when Tavily search fails or is empty
async function callGeminiFallback(prompt: string): Promise<string> {
  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
    });
    const res = await model.invoke(prompt);
    return typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  } catch (error) {
    console.error("Gemini fallback model error:", error);
    return "No travel data found.";
  }
}

// ── Supervisor Node (pure function, no LLM) ────────────────────────────────
function supervisorAgent(_state: typeof TripStateAnnotation.State) {
  return { logs: ["[supervisorAgent] Dispatching all 5 research workers in parallel..."] };
}

// Always dispatch all 5 workers simultaneously (one-time fan-out)
function routeSupervisor(): string[] {
  return ["hotelAgent", "flightAgent", "restaurantAgent", "attractionAgent", "weatherAgent"];
}

// ── Worker Nodes ───────────────────────────────────────────────────────────

async function hotelAgent(state: typeof TripStateAnnotation.State) {
  const query = `best hotels ${state.destination} budget ${state.budget} ${state.currency}`;
  const logStart = `[hotelAgent] Searching: "${query}"`;
  let result = await tavilySearch(query);
  if (!result || result.trim() === "") {
    const fallbackMsg = `[hotelAgent] Tavily empty — using Gemini fallback...`;
    result = await callGeminiFallback(
      `List 3 best hotels in ${state.destination} for a budget of ${state.budget} ${state.currency}. Include name, price per night, and rating.`
    );
    return { hotelData: result, logs: [logStart, fallbackMsg, `[hotelAgent] Done ✓`] };
  }
  return { hotelData: result, logs: [logStart, `[hotelAgent] Done ✓`] };
}

async function flightAgent(state: typeof TripStateAnnotation.State) {
  const query = `flights to ${state.destination} from ${state.origin || "India"} ${state.startDate}`;
  const logStart = `[flightAgent] Searching: "${query}"`;
  let result = await tavilySearch(query);
  if (!result || result.trim() === "") {
    const fallbackMsg = `[flightAgent] Tavily empty — using Gemini fallback...`;
    result = await callGeminiFallback(
      `Provide flight options from ${state.origin || "India"} to ${state.destination} around ${state.startDate}. Include airline and estimated cost.`
    );
    return { flightData: result, logs: [logStart, fallbackMsg, `[flightAgent] Done ✓`] };
  }
  return { flightData: result, logs: [logStart, `[flightAgent] Done ✓`] };
}

async function restaurantAgent(state: typeof TripStateAnnotation.State) {
  const query = `top restaurants ${state.destination} ${state.preferences || ""}`;
  const logStart = `[restaurantAgent] Searching: "${query}"`;
  let result = await tavilySearch(query);
  if (!result || result.trim() === "") {
    const fallbackMsg = `[restaurantAgent] Tavily empty — using Gemini fallback...`;
    result = await callGeminiFallback(
      `List top 3 restaurants in ${state.destination} for preferences: "${state.preferences || "none"}". Include name, cuisine, and average cost.`
    );
    return { restaurantData: result, logs: [logStart, fallbackMsg, `[restaurantAgent] Done ✓`] };
  }
  return { restaurantData: result, logs: [logStart, `[restaurantAgent] Done ✓`] };
}

async function attractionAgent(state: typeof TripStateAnnotation.State) {
  const query = `top attractions ${state.destination} ${state.preferences || ""}`;
  const logStart = `[attractionAgent] Searching: "${query}"`;
  let result = await tavilySearch(query);
  if (!result || result.trim() === "") {
    const fallbackMsg = `[attractionAgent] Tavily empty — using Gemini fallback...`;
    result = await callGeminiFallback(
      `List 4 top tourist attractions in ${state.destination} for preferences: "${state.preferences || "none"}". Include name, entry fee, and visit duration.`
    );
    return { attractionData: result, logs: [logStart, fallbackMsg, `[attractionAgent] Done ✓`] };
  }
  return { attractionData: result, logs: [logStart, `[attractionAgent] Done ✓`] };
}

async function weatherAgent(state: typeof TripStateAnnotation.State) {
  const query = `weather forecast typical weather ${state.destination} from ${state.startDate} to ${state.endDate}`;
  const logStart = `[weatherAgent] Searching: "${query}"`;
  let result = await tavilySearch(query);
  if (!result || result.trim() === "") {
    const fallbackMsg = `[weatherAgent] Tavily empty — using Gemini fallback...`;
    result = await callGeminiFallback(
      `Describe the typical weather or weather forecast in ${state.destination} between ${state.startDate} and ${state.endDate}. Specify conditions, temperature range, and packing advice.`
    );
    return { weatherData: result, logs: [logStart, fallbackMsg, `[weatherAgent] Done ✓`] };
  }
  return { weatherData: result, logs: [logStart, `[weatherAgent] Done ✓`] };
}

// ── Zod Schemas for Structured Output ──────────────────────────────────────
const hotelSchema = z.object({
  name: z.string(),
  pricePerNight: z.number(),
  rating: z.number()
});

const flightSchema = z.object({
  from: z.string(),
  to: z.string(),
  airline: z.string(),
  estimatedCost: z.number()
});

const restaurantSchema = z.object({
  name: z.string(),
  cuisine: z.string(),
  avgCost: z.number()
});

const attractionSchema = z.object({
  name: z.string(),
  entryFee: z.number(),
  duration: z.string()
});

const weatherSchema = z.object({
  condition: z.string().describe("Sunny, Rainy, Cloudy, Snowy, Windy, Stormy, etc."),
  temperature: z.string().describe("e.g. 22°C / 14°C"),
  description: z.string().describe("Brief tip like 'Pack an umbrella' or 'Great for walking'")
});

const mapLocationSchema = z.object({
  name: z.string(),
  type: z.enum(["hotel", "restaurant", "attraction"]),
  lat: z.number().describe("Latitude coordinate"),
  lng: z.number().describe("Longitude coordinate"),
  address: z.string().optional()
});

const mapRecommendationSchema = z.object({
  locations: z.array(mapLocationSchema).describe("List of map locations for markers")
});

const daySchema = z.object({
  day: z.number(),
  date: z.string(),
  theme: z.string(),
  hotel: hotelSchema.optional().nullable(),
  flights: z.array(flightSchema).optional().default([]),
  restaurants: z.array(restaurantSchema).optional().default([]),
  attractions: z.array(attractionSchema).optional().default([]),
  dailyEstimate: z.number(),
  weather: weatherSchema,
  mapRecommendation: mapRecommendationSchema
});

const itinerarySchema = z.object({
  itinerary: z.array(daySchema)
});

// ── Helper: sleep for ms milliseconds ─────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Draft Agent Node ───────────────────────────────────────────────────────
async function draftAgent(state: typeof TripStateAnnotation.State) {
  const logStart = `[draftAgent] Synthesizing itinerary with Gemini 2.5 Flash...`;

  const systemPrompt = "You are a professional travel planner. Generate a highly structured day-by-day travel itinerary for the destination based on the provided research. Return ONLY JSON matching the requested schema. Ensure the sum of dailyEstimates is strictly within the user's budget.";
  const userPrompt = `
Generate a day-by-day travel itinerary for ${state.destination} from ${state.startDate} to ${state.endDate}.
Budget: ${state.budget} ${state.currency} (STRICT BUDGET LIMIT: The sum of all "dailyEstimate" values across all days MUST be less than or equal to the total budget of ${state.budget} ${state.currency}. Adjust selection of hotels, flights, and restaurants accordingly to fit this limit).
Origin: ${state.origin || "Not specified"}
Preferences: ${state.preferences || "None"}

Researched travel data:
- Hotels: ${state.hotelData || "No data"}
- Flights: ${state.flightData || "No data"}
- Restaurants: ${state.restaurantData || "No data"}
- Attractions: ${state.attractionData || "No data"}
- Weather Forecast & Info: ${state.weatherData || "No data"}
${state.humanFeedback ? `\nUser feedback to incorporate: "${state.humanFeedback}"` : ""}

Instructions:
1. For each day, populate the hotel, restaurants, attractions, and flights based on the researched data.
2. Provide a weather object with a realistic condition (Sunny, Rainy, Cloudy, Snowy, Windy, Stormy), a temperature string (high/low range), and a description.
3. In mapRecommendation, include map locations for all the spots visited on that day (including the hotel, attractions, and restaurants). Provide realistic latitudes (lat) and longitudes (lng) coordinates in the city of ${state.destination}.
`.trim();

  const MAX_RETRIES = 3;
  const logs: string[] = [logStart];

  const model = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash" });
  const structuredModel = model.withStructuredOutput(itinerarySchema);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        logs.push(`[draftAgent] Retry attempt ${attempt}/${MAX_RETRIES}...`);
      }

      const response = await structuredModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      if (!response || !response.itinerary) {
        throw new Error("Gemini structured output is empty or invalid.");
      }

      const draft = response.itinerary.map((day: any) => {
        if (day.mapRecommendation && day.mapRecommendation.locations && day.mapRecommendation.locations.length > 0) {
          const locations = day.mapRecommendation.locations;

          const lats = locations.map((l: any) => l.lat).filter((l: any) => typeof l === "number" && !isNaN(l));
          const lngs = locations.map((l: any) => l.lng).filter((l: any) => typeof l === "number" && !isNaN(l));

          const centerLat = lats.length > 0 ? lats.reduce((a: number, b: number) => a + b, 0) / lats.length : 0;
          const centerLng = lngs.length > 0 ? lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length : 0;

          const hotel = locations.find((l: any) => l.type === "hotel") || locations[0];
          const others = locations.filter((l: any) => l !== hotel);

          const startName = hotel ? hotel.name : "";
          let routeUrl = "";
          if (others.length > 0) {
            const destName = others[others.length - 1].name;
            const waypoints = others.slice(0, -1).map((w: any) => encodeURIComponent(w.name)).join("%7C");
            routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startName)}+${state.destination}&destination=${encodeURIComponent(destName)}+${state.destination}&waypoints=${waypoints}`;
          } else {
            routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startName)}+${state.destination}&destination=${encodeURIComponent(startName)}+${state.destination}`;
          }

          day.mapRecommendation = { routeUrl, locations, centerLat, centerLng, zoom: 13 };
        }
        return day;
      });

      logs.push(`[draftAgent] Done ✓ — ${draft.length} days generated successfully.`);
      return { draft, humanFeedback: undefined, logs };

    } catch (error: any) {
      const is429 = error?.status === 429 || String(error?.message).includes("429") || String(error?.message).includes("Too Many Requests");

      if (is429 && attempt < MAX_RETRIES) {
        // Parse suggested retry delay from the error (e.g. "retryDelay: '33s'"), default to 20s
        let waitMs = 20000;
        const delayMatch = String(error?.message || "").match(/retryDelay["\s:]+['"]?(\d+)s/);
        if (delayMatch) waitMs = (parseInt(delayMatch[1]) + 2) * 1000; // add 2s buffer

        const waitSec = Math.round(waitMs / 1000);
        logs.push(`[draftAgent] Rate limited (429) — waiting ${waitSec}s before retry...`);
        console.warn(`[draftAgent] 429 rate limit on attempt ${attempt}. Waiting ${waitSec}s...`);
        await sleep(waitMs);
        continue;
      }

      // Non-429 error or last retry — give up
      console.error("draftAgent error:", error);
      logs.push(`[draftAgent] ERROR: ${error.message || String(error)}`);
      return { logs };
    }
  }

  // Should not reach here, but TypeScript needs a return
  return { logs: [...logs, "[draftAgent] ERROR: Exhausted all retries."] };
}

// ── Human Review Node ──────────────────────────────────────────────────────
function humanReview(_state: typeof TripStateAnnotation.State) {
  return { logs: [`[humanReview] Awaiting user approval.`] };
}

function routeHumanReview(state: typeof TripStateAnnotation.State): string {
  if (state.humanFeedback && state.humanFeedback.trim() !== "") {
    return "draftAgent";
  }
  return END;
}

// ── Build & Compile Graph ──────────────────────────────────────────────────
const workflow = new StateGraph(TripStateAnnotation)
  .addNode("supervisorAgent", supervisorAgent)
  .addNode("hotelAgent", hotelAgent)
  .addNode("flightAgent", flightAgent)
  .addNode("restaurantAgent", restaurantAgent)
  .addNode("attractionAgent", attractionAgent)
  .addNode("weatherAgent", weatherAgent)
  .addNode("draftAgent", draftAgent)
  .addNode("humanReview", humanReview)

  // START → supervisor
  .addEdge(START, "supervisorAgent")

  // Supervisor fans out to ALL 5 workers in parallel (one-time dispatch)
  .addConditionalEdges("supervisorAgent", routeSupervisor, {
    hotelAgent: "hotelAgent",
    flightAgent: "flightAgent",
    restaurantAgent: "restaurantAgent",
    attractionAgent: "attractionAgent",
    weatherAgent: "weatherAgent",
  })

  // All workers fan-in directly to draftAgent — LangGraph waits for all 5 before proceeding
  .addEdge("hotelAgent", "draftAgent")
  .addEdge("flightAgent", "draftAgent")
  .addEdge("restaurantAgent", "draftAgent")
  .addEdge("attractionAgent", "draftAgent")
  .addEdge("weatherAgent", "draftAgent")

  .addEdge("draftAgent", "humanReview")

  .addConditionalEdges("humanReview", routeHumanReview, {
    draftAgent: "draftAgent",
    [END]: END,
  });

export const compiledGraph = workflow.compile({
  checkpointer: new MemorySaver(),
  interruptBefore: ["humanReview"],
});
