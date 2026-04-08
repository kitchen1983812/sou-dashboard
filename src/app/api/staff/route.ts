import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const revalidate = 300;

export interface StaffNursery {
	name: string;
	area: string;
	total: number;
	seishain: number;
	rate: number;
	breakdown: Record<string, number>;
}

interface StaffFile {
	exportedAt: string;
	nurseries: StaffNursery[];
	summary: { total: number; seishain: number; rate: number };
}

export async function GET() {
	const filePath = path.join(
		process.cwd(),
		"public",
		"staff",
		"employees.json",
	);
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const data: StaffFile = JSON.parse(raw);
		return NextResponse.json(data);
	} catch {
		return NextResponse.json(
			{ error: "職員データがありません。employees.jsonを配置してください。" },
			{ status: 500 },
		);
	}
}
