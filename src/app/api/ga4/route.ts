import { NextRequest, NextResponse } from "next/server";
import { fetchGA4Data } from "@/lib/ga4";
import { GA4Period } from "@/types/ga4";

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") || "30d") as GA4Period;
  try {
    const data = await fetchGA4Data(period);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
