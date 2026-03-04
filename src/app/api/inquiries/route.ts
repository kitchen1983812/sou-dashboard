import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/googleSheets";
import { transformInquiries } from "@/lib/transform";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheet") || "全データ";

    const rawData = await getSheetData(sheetName);
    const inquiries = transformInquiries(rawData);

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
