import { Annotation } from "@langchain/langgraph";
import { IDay } from "./types";

export const TripStateAnnotation = Annotation.Root({
  origin: Annotation<string | undefined>(),
  destination: Annotation<string>(),
  startDate: Annotation<string>(),
  endDate: Annotation<string>(),
  budget: Annotation<number>(),
  currency: Annotation<string>(),
  preferences: Annotation<string | undefined>(),
  hotelData: Annotation<string | undefined>(),
  flightData: Annotation<string | undefined>(),
  restaurantData: Annotation<string | undefined>(),
  attractionData: Annotation<string | undefined>(),
  weatherData: Annotation<string | undefined>(),
  draft: Annotation<IDay[] | undefined>(),
  humanFeedback: Annotation<string | undefined>(),
  logs: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  workersComplete: Annotation<string[]>({
    reducer: (left, right) => Array.from(new Set([...left, ...right])),
    default: () => [],
  }),
});
