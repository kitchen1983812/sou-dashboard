import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSheetData, writeSheetData } from "@/lib/googleSheets";
import {
	FACILITY_MAP,
	EXCLUDE_FACILITIES,
	SEISHAIN_TYPES,
	EMP_ORDER,
	STAFF_SHEET_NAME,
} from "@/config/staffConfig";

export const dynamic = "force-dynamic";

export interface StaffNursery {
	name: string;
	area: string;
	total: number;
	seishain: number;
	rate: number;
	breakdown: Record<string, number>;
}

interface StaffData {
	exportedAt: string;
	nurseries: StaffNursery[];
	summary: { total: number; seishain: number; rate: number };
}

/** シートデータ → StaffData に変換 */
function parseSheetRows(rows: string[][]): StaffData | null {
	if (rows.length < 2) return null;
	// header: [取得日, 園名, エリア, 全職員数, 正社員数, 比率, ...EMP_ORDER]
	const exportedAt = rows[1]?.[0] ?? "";
	const nurseries: StaffNursery[] = rows.slice(1).map((row) => {
		const breakdown: Record<string, number> = {};
		EMP_ORDER.forEach((emp, i) => {
			breakdown[emp] = Number(row[6 + i] ?? 0);
		});
		return {
			name: row[1] ?? "",
			area: row[2] ?? "",
			total: Number(row[3] ?? 0),
			seishain: Number(row[4] ?? 0),
			rate: Number(row[5] ?? 0),
			breakdown,
		};
	});
	const total = nurseries.reduce((s, n) => s + n.total, 0);
	const seishain = nurseries.reduce((s, n) => s + n.seishain, 0);
	return {
		exportedAt,
		nurseries,
		summary: {
			total,
			seishain,
			rate: total > 0 ? Math.round((seishain / total) * 1000) / 10 : 0,
		},
	};
}

/** CSV文字列 → StaffData に変換（ジョブカン形式） */
function parseCsv(csvText: string): { data: StaffData; warnings: string[] } {
	const warnings: string[] = [];

	// BOM除去・改行正規化
	const text = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
	const lines = text.split("\n").filter((l) => l.trim());
	if (lines.length < 2) throw new Error("CSVにデータ行がありません");

	// ヘッダー解析
	const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
	const colOf = (name: string) => headers.indexOf(name);
	const facilityCol = colOf("施設名");
	const empTypeCol = colOf("雇用形態");
	if (facilityCol === -1 || empTypeCol === -1) {
		throw new Error("「施設名」または「雇用形態」列が見つかりません");
	}

	// 行ごとに集計
	const byFacility: Record<string, string[]> = {};
	for (const line of lines.slice(1)) {
		const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
		const facility = cols[facilityCol] ?? "";
		if (!facility) continue;
		if (EXCLUDE_FACILITIES.has(facility)) continue;
		if (!byFacility[facility]) byFacility[facility] = [];
		byFacility[facility].push(cols[empTypeCol] ?? "");
	}

	// 施設名を正規化して集計
	const merged: Record<string, { name: string; area: string; emps: string[] }> = {};
	for (const [facility, emps] of Object.entries(byFacility)) {
		const mapped = FACILITY_MAP[facility];
		if (!mapped) {
			warnings.push(`施設名「${facility}」はマッピング未登録のためスキップしました`);
			continue;
		}
		const key = mapped.name;
		if (!merged[key]) merged[key] = { name: mapped.name, area: mapped.area, emps: [] };
		merged[key].emps.push(...emps);
	}

	const today = new Date().toISOString().slice(0, 10);
	const nurseries: StaffNursery[] = Object.values(merged)
		.map(({ name, area, emps }) => {
			const total = emps.length;
			const seishain = emps.filter((e) => SEISHAIN_TYPES.has(e)).length;
			const rate = total > 0 ? Math.round((seishain / total) * 1000) / 10 : 0;
			const breakdown: Record<string, number> = {};
			for (const emp of EMP_ORDER) breakdown[emp] = 0;
			for (const emp of emps) {
				if (emp in breakdown) breakdown[emp]++;
			}
			return { name, area, total, seishain, rate, breakdown };
		})
		.sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));

	const total = nurseries.reduce((s, n) => s + n.total, 0);
	const seishain = nurseries.reduce((s, n) => s + n.seishain, 0);

	return {
		data: {
			exportedAt: today,
			nurseries,
			summary: {
				total,
				seishain,
				rate: total > 0 ? Math.round((seishain / total) * 1000) / 10 : 0,
			},
		},
		warnings,
	};
}

/** StaffData → Sheetsに書き込む2次元配列 */
function toSheetRows(data: StaffData): string[][] {
	const header = [
		"取得日",
		"園名",
		"エリア",
		"全職員数",
		"正社員数",
		"正社員比率",
		...EMP_ORDER,
	];
	const rows = data.nurseries.map((n) => [
		data.exportedAt,
		n.name,
		n.area,
		String(n.total),
		String(n.seishain),
		String(n.rate),
		...EMP_ORDER.map((e) => String(n.breakdown[e] ?? 0)),
	]);
	return [header, ...rows];
}

export async function GET() {
	// まずSheetsから読む、失敗時はJSONフォールバック
	try {
		const rows = await getSheetData(
			STAFF_SHEET_NAME,
			process.env.GOOGLE_SHEET_ID,
		);
		const data = parseSheetRows(rows);
		if (data && data.nurseries.length > 0) {
			return NextResponse.json(data);
		}
	} catch {
		// シートが存在しない場合などは無視してフォールバック
	}

	// フォールバック: public/staff/employees.json
	const filePath = path.join(process.cwd(), "public", "staff", "employees.json");
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		return NextResponse.json(JSON.parse(raw));
	} catch {
		return NextResponse.json(
			{ error: "職員データがありません。CSVをアップロードしてください。" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");
		if (!file || typeof file === "string") {
			return NextResponse.json({ error: "ファイルが添付されていません" }, { status: 400 });
		}

		const text = await (file as File).text();
		const { data, warnings } = parseCsv(text);

		// Sheetsに書き込み
		await writeSheetData(
			STAFF_SHEET_NAME,
			toSheetRows(data),
			process.env.GOOGLE_SHEET_ID,
		);

		return NextResponse.json({ success: true, data, warnings });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
