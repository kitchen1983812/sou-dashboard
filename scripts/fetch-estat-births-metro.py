"""
e-Stat「市区町村データ 基礎データ(廃置分合処理済) A 人口・世帯」(statsDataId=0000020201)
から1都3県全市区町村の出生数(A4101)を取得し、既存 market-research/data.json にマージする。

実行: ESTAT_APP_ID=xxxx C:/Python314/python.exe scripts/fetch-estat-births-metro.py

出典記載: e-Stat (政府統計総合窓口) API機能を使用
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ESTAT_APP_ID = os.environ.get("ESTAT_APP_ID")
if not ESTAT_APP_ID:
    sys.stderr.write("ERROR: ESTAT_APP_ID 環境変数が未設定です。\n")
    sys.exit(1)

STATS_DATA_ID = "0000020201"
INDICATOR_CODE = "A4101"  # 出生数

# 1都3県の都道府県コード範囲 (5桁市区町村コードの先頭2桁)
# 11=埼玉県 / 12=千葉県 / 13=東京都 / 14=神奈川県
PREF_RANGES = [
    ("11", "11000", "11999", "埼玉県"),
    ("12", "12000", "12999", "千葉県"),
    ("13", "13000", "13999", "東京都"),
    ("14", "14000", "14999", "神奈川県"),
]

# 取得年範囲: 2014-2023年度 (e-Statの直近10年)
TIME_FROM = "2014100000"
TIME_TO = "2023100000"

BASE = "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData"


def fetch_pref(pref_code: str, area_from: str, area_to: str) -> dict:
    params = {
        "appId": ESTAT_APP_ID,
        "statsDataId": STATS_DATA_ID,
        "cdCat01": INDICATOR_CODE,
        "cdAreaFrom": area_from,
        "cdAreaTo": area_to,
        "cdTimeFrom": TIME_FROM,
        "cdTimeTo": TIME_TO,
    }
    url = f"{BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=90) as res:
        body = res.read()
    return json.loads(body)


def parse_value(value_obj) -> float | None:
    if isinstance(value_obj, dict):
        v = value_obj.get("$")
    else:
        v = value_obj
    if v is None or v == "" or v == "-":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def main():
    repo_root = Path(__file__).resolve().parents[1]
    snapshot_path = repo_root / "public" / "snapshots" / "market-research" / "data.json"
    if not snapshot_path.exists():
        sys.stderr.write(f"ERROR: snapshot not found: {snapshot_path}\n")
        sys.stderr.write("先に build-market-research-snapshot.py を実行してください。\n")
        sys.exit(1)

    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    existing_codes = set(snapshot["cities"].keys())
    snapshot_years = snapshot["meta"]["years"]

    # e-Stat 取得年 → snapshot.meta.years のインデックスマップ
    estat_years = list(range(2014, 2024))
    year_to_snapshot_idx = {y: snapshot_years.index(y) for y in estat_years if y in snapshot_years}
    if not year_to_snapshot_idx:
        sys.stderr.write("ERROR: snapshot.meta.years と e-Stat 取得年に重複がありません。\n")
        sys.exit(1)

    added = 0
    updated_existing = 0
    skipped_existing = 0

    for pref_code, area_from, area_to, pref_name in PREF_RANGES:
        print(f"Fetching {pref_name} ({pref_code}xxx)...")
        try:
            resp = fetch_pref(pref_code, area_from, area_to)
        except Exception as e:
            sys.stderr.write(f"  ERROR: {e}\n")
            continue

        result = resp.get("GET_STATS_DATA", {}).get("STATISTICAL_DATA", {})
        status = resp.get("GET_STATS_DATA", {}).get("RESULT", {}).get("STATUS")
        if status != 0:
            err = resp.get("GET_STATS_DATA", {}).get("RESULT", {}).get("ERROR_MSG", "unknown")
            sys.stderr.write(f"  ERROR status={status}: {err}\n")
            continue

        # area コード → 名称マップ
        class_obj = result.get("CLASS_INF", {}).get("CLASS_OBJ", [])
        area_map: dict[str, str] = {}
        for c in class_obj:
            if c.get("@id") == "area":
                children = c.get("CLASS", [])
                if not isinstance(children, list):
                    children = [children]
                for ch in children:
                    full_name = ch.get("@name", "")
                    # 例: "東京都 大田区" → "大田区"
                    parts = full_name.split(" ", 1)
                    city_name = parts[1] if len(parts) > 1 else full_name
                    area_map[ch.get("@code")] = city_name

        values = result.get("DATA_INF", {}).get("VALUE", [])
        if not isinstance(values, list):
            values = [values]

        # city_code → { year: value }
        city_year_value: dict[str, dict[int, float]] = {}
        for v in values:
            area_code = v.get("@area")
            time_code = v.get("@time")
            year = int(time_code[:4]) if time_code else None
            value = parse_value(v)
            if not area_code or year is None:
                continue
            city_year_value.setdefault(area_code, {})[year] = value if value is not None else None

        for city_code, year_value in city_year_value.items():
            # 政令市の親レコード(例: 11100 さいたま市) は子区も別行で来るが両方残す
            city_name = area_map.get(city_code, "")
            if not city_name:
                continue

            if city_code in existing_codes:
                # 既存(Excel由来)はそのまま残す
                skipped_existing += 1
                continue

            # 新規市区町村として追加
            births_series: list[float | None] = [None] * len(snapshot_years)
            for year, value in year_value.items():
                idx = year_to_snapshot_idx.get(year)
                if idx is not None:
                    births_series[idx] = value

            snapshot["cities"][city_code] = {
                "code": city_code,
                "prefCode": pref_code,
                "prefName": pref_name,
                "name": city_name,
                "isMetropolitan": True,
                "data": {
                    "births": births_series,
                    "capacity": [None] * len(snapshot_years),
                    "enrollment": [None] * len(snapshot_years),
                    "utilization": [None] * len(snapshot_years),
                },
                "sourceTag": "e-stat",
            }
            added += 1

        # レート制限対策
        time.sleep(1.2)

    # meta 更新
    jst = timezone(timedelta(hours=9))
    snapshot["meta"]["generatedAt"] = datetime.now(jst).isoformat()
    snapshot["meta"]["source"] = (
        "ver2.2000~2025年各自治体出生数・保育所定員・利用人数.xlsx "
        "+ e-Stat (政府統計総合窓口) API機能 [社会・人口統計体系 0000020201]"
    )
    snapshot["meta"]["totalCities"] = len(snapshot["cities"])
    snapshot["meta"]["metropolitanCities"] = sum(
        1 for c in snapshot["cities"].values() if c.get("isMetropolitan")
    )
    snapshot["meta"]["estatSupplementYears"] = estat_years
    snapshot["meta"]["estatNote"] = (
        "e-Stat 補完分は 2014-2023 年度のみ。"
        "それ以前の年度と保育所定員・利用人数は元データに含まれる市区町村のみ参照可。"
    )

    snapshot_path.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print()
    print(f"Done. Updated: {snapshot_path}")
    print(f"  New cities added (e-Stat): {added}")
    print(f"  Existing cities skipped: {skipped_existing}")
    print(f"  Total cities now: {snapshot['meta']['totalCities']}")
    print(f"  Metropolitan cities: {snapshot['meta']['metropolitanCities']}")


if __name__ == "__main__":
    main()
