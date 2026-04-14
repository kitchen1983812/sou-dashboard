import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSheetData, writeSheetData } from "@/lib/googleSheets";
import {
	BrandCategory,
	classifyBrand,
	GROUP_REVIEWS_SHEET_NAME,
} from "@/config/brandConfig";

export const dynamic = "force-dynamic";

export interface GroupNursery {
	name: string;
	placeId: string;
	count: number;
	rating: number | null;
	brand: string;
	category: BrandCategory;
}

export interface GroupBrandSummary {
	category: BrandCategory;
	brand: string;
	nurseryCount: number;
	totalReviews: number;
	avgRating: number | null;
	nurseries: GroupNursery[];
}

interface GroupReviewsData {
	exportedAt: string;
	brands: GroupBrandSummary[];
}

/** 園リスト → ブランド別に集計 */
function aggregateByBrand(nurseries: GroupNursery[]): GroupBrandSummary[] {
	const grouped = new Map<string, GroupNursery[]>();
	for (const n of nurseries) {
		const key = `${n.category}|${n.brand}`;
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(n);
	}
	const result: GroupBrandSummary[] = [];
	grouped.forEach((list: GroupNursery[], key: string) => {
		const [category, brand] = key.split("|");
		const totalReviews = list.reduce((s: number, n: GroupNursery) => s + n.count, 0);
		const ratings = list
			.filter((n: GroupNursery) => n.rating != null)
			.map((n: GroupNursery) => n.rating as number);
		const avgRating =
			ratings.length > 0
				? Math.round((ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length) * 100) / 100
				: null;
		result.push({
			category: category as BrandCategory,
			brand,
			nurseryCount: list.length,
			totalReviews,
			avgRating,
			nurseries: [...list].sort((a: GroupNursery, b: GroupNursery) => b.count - a.count),
		});
	});
	return result.sort((a, b) => {
		// 自社を先に、園数が多い順
		if (a.category !== b.category) return a.category === "自社" ? -1 : 1;
		return b.nurseryCount - a.nurseryCount;
	});
}

/** シートデータ → JSON */
function parseSheetRows(rows: string[][]): GroupReviewsData | null {
	if (rows.length < 2) return null;
	const exportedAt = rows[1]?.[0] ?? "";
	const nurseries: GroupNursery[] = rows.slice(1).map((row) => {
		const name = row[1] ?? "";
		const { brand, category } = classifyBrand(name);
		return {
			name,
			placeId: row[2] ?? "",
			count: Number(row[3] ?? 0),
			rating: row[4] ? Number(row[4]) : null,
			brand,
			category,
		};
	});
	return { exportedAt, brands: aggregateByBrand(nurseries) };
}

/** Excelアップロード相当のJSON(外部処理済み)または直接JSON受信 */
interface UploadRow {
	name: string;
	placeId: string;
	count: number;
	rating: number | null;
}

function buildFromRows(rows: UploadRow[], exportedAt: string): GroupReviewsData {
	const nurseries: GroupNursery[] = rows.map((r) => {
		const { brand, category } = classifyBrand(r.name);
		return { ...r, brand, category };
	});
	return { exportedAt, brands: aggregateByBrand(nurseries) };
}

function toSheetRows(data: GroupReviewsData): string[][] {
	const header = ["取得日", "園名", "Place ID", "クチコミ数", "星評価", "ブランド", "カテゴリ"];
	const rows: string[][] = [header];
	for (const b of data.brands) {
		for (const n of b.nurseries) {
			rows.push([
				data.exportedAt,
				n.name,
				n.placeId,
				String(n.count),
				n.rating != null ? String(n.rating) : "",
				n.brand,
				n.category,
			]);
		}
	}
	return rows;
}

export async function GET() {
	// まずSheetsから読む
	try {
		const rows = await getSheetData(GROUP_REVIEWS_SHEET_NAME, process.env.GOOGLE_SHEET_ID);
		const data = parseSheetRows(rows);
		if (data && data.brands.length > 0) {
			return NextResponse.json(data);
		}
	} catch {
		// シート未作成時はフォールバック
	}

	// フォールバック: public/group-reviews/data.json
	const filePath = path.join(process.cwd(), "public", "group-reviews", "data.json");
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		return NextResponse.json(JSON.parse(raw));
	} catch {
		return NextResponse.json(
			{ error: "グループ園データがありません。Excelをアップロードしてください。" },
			{ status: 500 },
		);
	}
}

/** Excelを解析してグループ園データを更新 */
export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");
		if (!file || typeof file === "string") {
			return NextResponse.json({ error: "ファイルが添付されていません" }, { status: 400 });
		}

		// ExcelJSで読み取り
		const arrayBuf = await (file as File).arrayBuffer();
		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.load(arrayBuf as ArrayBuffer);

		const masterSheet = wb.getWorksheet("園マスタ");
		const aggSheet = wb.getWorksheet("集計");
		if (!masterSheet || !aggSheet) {
			return NextResponse.json(
				{ error: "「園マスタ」または「集計」シートが見つかりません" },
				{ status: 400 },
			);
		}

		// 園マスタ: 園名 → Place ID
		const placeIdMap = new Map<string, string>();
		masterSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
			if (rowNum === 1) return;
			const name = row.getCell(1).text?.trim();
			const placeId = row.getCell(2).text?.trim();
			if (name && placeId) placeIdMap.set(name, placeId);
		});

		// 集計: 園名 → {count, rating}
		// R列(18)=最新数、AD列(30)=最新星
		const rows: UploadRow[] = [];
		aggSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
			if (rowNum === 1) return;
			const name = row.getCell(1).text?.trim();
			if (!name) return;
			const placeId = placeIdMap.get(name);
			if (!placeId) return;
			const countCell = row.getCell(18).value;
			const ratingCell = row.getCell(30).value;
			const count = typeof countCell === "number" ? countCell : Number(countCell) || 0;
			const rating =
				typeof ratingCell === "number" && ratingCell > 0
					? ratingCell
					: ratingCell && !isNaN(Number(ratingCell)) && Number(ratingCell) > 0
						? Number(ratingCell)
						: null;
			rows.push({ name, placeId, count, rating });
		});

		if (rows.length === 0) {
			return NextResponse.json({ error: "有効なデータ行が見つかりませんでした" }, { status: 400 });
		}

		const today = new Date().toISOString().slice(0, 10);
		const data = buildFromRows(rows, today);

		await writeSheetData(
			GROUP_REVIEWS_SHEET_NAME,
			toSheetRows(data),
			process.env.GOOGLE_SHEET_ID,
		);

		return NextResponse.json({ success: true, data, rowCount: rows.length });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
