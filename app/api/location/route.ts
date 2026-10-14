import { NextRequest, NextResponse } from "next/server";
import { defaultLocation, estimateLocation } from "@/lib/location";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip") ?? "";
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: "Enter a five-digit ZIP code." }, { status: 400 });
  if (zip === "17011") return NextResponse.json(defaultLocation);
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
    if (!response.ok) return NextResponse.json({ error: "ZIP lookup unavailable. Default estimates are in use." }, { status: response.status === 404 ? 404 : 503 });
    const data = await response.json();
    const place = data.places?.[0];
    if (!place || typeof place["state abbreviation"] !== "string" || typeof place["place name"] !== "string") throw new Error("Invalid location");
    const state = place["state abbreviation"];
    return NextResponse.json(estimateLocation(zip, place["place name"], state));
  } catch {
    return NextResponse.json({ error: "Location lookup is temporarily unavailable. Default estimates are in use." }, { status: 503 });
  }
}
