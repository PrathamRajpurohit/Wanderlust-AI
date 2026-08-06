import { NextResponse } from "next/server";

export const runtime = "edge";

interface GooglePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input");

  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google API key not configured", predictions: [] },
      { status: 503 }
    );
  }

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    url.searchParams.set("input", input.trim());
    url.searchParams.set("types", "(regions)");  // cities, countries, regions
    url.searchParams.set("language", "en");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en" },
    });

    if (!res.ok) {
      throw new Error(`Google Places API returned ${res.status}`);
    }

    const data = await res.json();

    if (data.status === "REQUEST_DENIED") {
      console.error("Google Places API denied:", data.error_message);
      // Return empty so client falls back to OSM
      return NextResponse.json({ predictions: [], fallback: true });
    }

    const predictions = (data.predictions ?? []).map(
      (p: GooglePrediction) => ({
        description: p.description,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? "",
        placeId: p.place_id,
      })
    );

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("Places autocomplete error:", err);
    return NextResponse.json({ predictions: [], fallback: true });
  }
}
