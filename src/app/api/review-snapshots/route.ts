import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export interface SnapshotPoint {
	date: string;
	totalCount: number;
}

interface SnapshotFile {
	date: string;
	counts: Record<string, { count: number }>;
}

export async function GET() {
	const snapshotDir = path.join(process.cwd(), "public", "snapshots");
	const points: SnapshotPoint[] = [];
	try {
		const files = fs.readdirSync(snapshotDir);
		for (const f of files) {
			if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
			try {
				const raw = fs.readFileSync(path.join(snapshotDir, f), "utf-8");
				const data: SnapshotFile = JSON.parse(raw);
				const total = Object.values(data.counts ?? {}).reduce(
					(s, v) => s + (v?.count ?? 0),
					0,
				);
				points.push({ date: data.date, totalCount: total });
			} catch {
				continue;
			}
		}
		points.sort((a, b) => a.date.localeCompare(b.date));
		return NextResponse.json({ points });
	} catch {
		return NextResponse.json({ points: [] });
	}
}
