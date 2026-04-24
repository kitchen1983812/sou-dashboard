import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { BrandCategory, classifyBrand } from "@/config/brandConfig";

// JSONベース（週次更新）→ 1時間キャッシュ。デプロイ時に自動失効
export const revalidate = 3600;

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

interface RawNursery {
	name: string;
	placeId: string;
	count: number;
	rating: number | null;
}

/** 園リスト → ブランド別に集計 */
function aggregateByBrand(nurseries: RawNursery[]): GroupBrandSummary[] {
	// classifyBrand で毎回再分類（保存値は無視）
	const classified: GroupNursery[] = nurseries.map((n) => {
		const { brand, category } = classifyBrand(n.name);
		return { ...n, brand, category };
	});

	const grouped = new Map<string, GroupNursery[]>();
	for (const n of classified) {
		const key = `${n.category}|${n.brand}`;
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(n);
	}

	const result: GroupBrandSummary[] = [];
	grouped.forEach((list, key) => {
		const [category, brand] = key.split("|");
		const totalReviews = list.reduce((s, n) => s + n.count, 0);
		const ratings = list
			.filter((n) => n.rating != null)
			.map((n) => n.rating as number);
		const avgRating =
			ratings.length > 0
				? Math.round(
						(ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100,
					) / 100
				: null;
		result.push({
			category: category as BrandCategory,
			brand,
			nurseryCount: list.length,
			totalReviews,
			avgRating,
			nurseries: [...list].sort((a, b) => b.count - a.count),
		});
	});

	return result.sort((a, b) => {
		if (a.category !== b.category) return a.category === "自社" ? -1 : 1;
		return b.nurseryCount - a.nurseryCount;
	});
}

/** JSONファイルを読む（public/group-reviews/data.json） */
function loadJsonData(): GroupReviewsData | null {
	const filePath = path.join(
		process.cwd(),
		"public",
		"group-reviews",
		"data.json",
	);
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw) as GroupReviewsData;
		// 各nurseryを平坦化 → aggregateByBrand で再集計（分類ロジックを毎回再適用）
		const flat: RawNursery[] = [];
		for (const b of parsed.brands ?? []) {
			for (const n of b.nurseries ?? []) {
				flat.push({
					name: n.name,
					placeId: n.placeId,
					count: n.count,
					rating: n.rating,
				});
			}
		}
		return { exportedAt: parsed.exportedAt, brands: aggregateByBrand(flat) };
	} catch {
		return null;
	}
}

export async function GET() {
	const data = loadJsonData();
	if (!data) {
		return NextResponse.json(
			{
				error:
					"グループ園データがありません。Excelをアップロードしてください。",
			},
			{ status: 500 },
		);
	}
	return NextResponse.json(data, {
		headers: {
			"Cache-Control":
				"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}

/** Excelアップロードでの更新 */
export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");
		if (!file || typeof file === "string") {
			return NextResponse.json(
				{ error: "ファイルが添付されていません" },
				{ status: 400 },
			);
		}

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

		// ヘッダーから「数(YYYY/MM/DD)」「星(YYYY/MM/DD)」の最新列を動的検出
		const headerRow = aggSheet.getRow(1);
		const countCols: { col: number; date: string }[] = [];
		const ratingCols: { col: number; date: string }[] = [];
		headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
			const s = String(cell.value ?? "");
			const mCount = s.match(/数\((\d{2}\/\d{2}\/\d{2})\)/);
			const mRating = s.match(/星\((\d{2}\/\d{2}\/\d{2})\)/);
			if (mCount) countCols.push({ col, date: mCount[1] });
			if (mRating) ratingCols.push({ col, date: mRating[1] });
		});
		if (countCols.length === 0 || ratingCols.length === 0) {
			return NextResponse.json(
				{
					error:
						"集計シートに「数(YYYY/MM/DD)」「星(YYYY/MM/DD)」列が見つかりません",
				},
				{ status: 400 },
			);
		}
		const countColIdx = countCols.sort((a, b) =>
			b.date.localeCompare(a.date),
		)[0].col;
		const ratingColIdx = ratingCols.sort((a, b) =>
			b.date.localeCompare(a.date),
		)[0].col;

		const rows: RawNursery[] = [];
		aggSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
			if (rowNum === 1) return;
			const name = row.getCell(1).text?.trim();
			if (!name) return;
			const placeId = placeIdMap.get(name);
			if (!placeId) return;
			const countCell = row.getCell(countColIdx).value;
			const ratingCell = row.getCell(ratingColIdx).value;
			const count =
				typeof countCell === "number" ? countCell : Number(countCell) || 0;
			let rating: number | null = null;
			if (typeof ratingCell === "number" && ratingCell > 0) rating = ratingCell;
			else if (
				ratingCell &&
				!isNaN(Number(ratingCell)) &&
				Number(ratingCell) > 0
			) {
				rating = Number(ratingCell);
			}
			rows.push({ name, placeId, count, rating });
		});

		if (rows.length === 0) {
			return NextResponse.json(
				{ error: "有効なデータ行が見つかりませんでした" },
				{ status: 400 },
			);
		}

		const today = new Date().toISOString().slice(0, 10);
		const aggregated = aggregateByBrand(rows);

		// 永続化: public/group-reviews/data.json を上書き（Vercelでは runtime でも書けるが再デプロイ時リセット）
		// Vercel serverless では /tmp のみ書き込み可能。public は読み取り専用。
		// そのため、ここでは処理結果をレスポンスで返すのみ。永続化は CI/ローカルで JSON更新する運用
		return NextResponse.json({
			success: true,
			data: { exportedAt: today, brands: aggregated },
			rowCount: rows.length,
			note: "データはセッション中のみ有効です。恒久化には public/group-reviews/data.json を更新してください。",
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
