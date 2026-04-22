import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/googleSheets";
import { NURSERIES } from "@/config/reviewConfig";

export const dynamic = "force-dynamic";

const OCCUPANCY_SHEET_ID = process.env.GOOGLE_SHEET_ID_OCCUPANCY || "";

/** 園名→エリアのマップ（reviewConfig + 追加分） */
const AREA_MAP: Record<string, string> = {};
for (const n of NURSERIES) {
	AREA_MAP[n.name] = n.area;
}

const AGE_CLASS_INDEX: Record<string, number> = {
	"0歳児": 0,
	"1歳児": 1,
	"2歳児": 2,
	"3歳児": 3,
	"4歳児": 4,
	"5歳児": 5,
};

export interface OccupancyNursery {
	nursery: string;
	area: string;
	yearMonth: string;
	capacity: [number, number, number, number, number, number];
	enrolled: [number, number, number, number, number, number];
}

export async function GET() {
	if (!OCCUPANCY_SHEET_ID) {
		return NextResponse.json(
			{ error: "GOOGLE_SHEET_ID_OCCUPANCY が設定されていません" },
			{ status: 500 },
		);
	}

	try {
		const raw = await getSheetData("園児数", OCCUPANCY_SHEET_ID);
		if (raw.length <= 1) {
			return NextResponse.json({ nurseries: [], yearMonth: null });
		}

		// ヘッダー: [年月, 園名, 年齢クラス, 定員, 在園児数, 充足率]
		const rows = raw.slice(1);

		// 園名ごとにグルーピング（最新の年月のみ使用）
		const latestYearMonth = rows.reduce((latest, row) => {
			const ym = row[0] || "";
			return ym > latest ? ym : latest;
		}, "");

		const grouped: Record<
			string,
			{ capacity: number[]; enrolled: number[]; yearMonth: string }
		> = {};

		for (const row of rows) {
			const yearMonth = row[0] || "";
			const nursery = row[1] || "";
			const ageClass = row[2] || "";
			const capacity = row[3] ? Number(row[3]) : 0;
			const enrolled = row[4] ? Number(row[4]) : 0;

			// 最新年月のデータのみ
			if (yearMonth !== latestYearMonth) continue;

			const idx = AGE_CLASS_INDEX[ageClass];
			if (idx === undefined) continue;

			if (!grouped[nursery]) {
				grouped[nursery] = {
					capacity: [0, 0, 0, 0, 0, 0],
					enrolled: [0, 0, 0, 0, 0, 0],
					yearMonth,
				};
			}
			grouped[nursery].capacity[idx] = capacity;
			grouped[nursery].enrolled[idx] = enrolled;
		}

		const nurseries: OccupancyNursery[] = Object.entries(grouped)
			.map(([name, data]) => ({
				nursery: name,
				area: AREA_MAP[name] || "",
				yearMonth: data.yearMonth,
				capacity: data.capacity as [
					number,
					number,
					number,
					number,
					number,
					number,
				],
				enrolled: data.enrolled as [
					number,
					number,
					number,
					number,
					number,
					number,
				],
			}))
			.sort((a, b) => {
				const ac = a.area.localeCompare(b.area);
				if (ac !== 0) return ac;
				return a.nursery.localeCompare(b.nursery);
			});

		return NextResponse.json(
			{
				nurseries,
				yearMonth: latestYearMonth,
				fetchedAt: new Date().toISOString(),
			},
			{ headers: { "Cache-Control": "no-store, max-age=0" } },
		);
	} catch (error) {
		console.error("Failed to fetch occupancy:", error);
		return NextResponse.json(
			{ error: "定員充足率データの取得に失敗しました" },
			{ status: 500 },
		);
	}
}
