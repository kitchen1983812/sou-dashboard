import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { BrandCategory } from "@/config/brandConfig";

// JSONベース（週次更新）→ 1時間キャッシュ
export const revalidate = 3600;

export interface AgeCapacity {
	capacity: number;
	enrolled: number;
}

export interface GroupCapacityNursery {
	name: string;
	rawName: string;
	company: string;
	brand: string;
	category: BrandCategory;
	management: string;
	form: string;
	yearMonth: string;
	totalCapacity: number;
	totalEnrolled: number;
	prevExited: number;
	prevEntered: number;
	fillRate: number | null;
	ages: AgeCapacity[];
	updatedAt: string;
}

export interface GroupCapacityData {
	exportedAt: string;
	yearMonth: string;
	nurseries: GroupCapacityNursery[];
}

export async function GET() {
	const filePath = path.join(
		process.cwd(),
		"public",
		"group-capacity",
		"data.json",
	);
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const data: GroupCapacityData = JSON.parse(raw);
		return NextResponse.json(data, {
			headers: {
				"Cache-Control":
					"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
			},
		});
	} catch {
		return NextResponse.json(
			{
				error:
					"グループ定員データがありません。CSVをアップロードしてください。",
			},
			{ status: 500 },
		);
	}
}
