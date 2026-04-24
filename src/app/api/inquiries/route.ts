import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/googleSheets";
import { transformInquiries } from "@/lib/transform";

// Sheets（問い合わせ、日次変動）→ 10分キャッシュ
export const revalidate = 600;

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
			{ status: 500 },
		);
	}
}
