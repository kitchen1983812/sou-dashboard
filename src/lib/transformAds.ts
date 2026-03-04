import { AdKeywordRow, AdSearchQueryRow } from "@/types/ads";

/**
 * 【AX】Google広告パフォーマンスシートの列マッピング（検索キーワードレベル）
 * Headers: 日, キーワード ID, 検索キーワード, 通貨コード, 費用, 平均クリック単価,
 *          コンバージョン単価, 表示回数, クリック数, コンバージョン, ...
 */
const KW_COLS: Record<string, string> = {
  date: "日",
  keywordId: "キーワード ID",
  keyword: "検索キーワード",
  cost: "費用",
  impressions: "表示回数",
  clicks: "クリック数",
  conversions: "コンバージョン",
};

/**
 * 検索語句シートの列マッピング
 * Headers: 日, キーワード ID, 検索語句, 通貨コード, 費用, ...
 */
const SQ_COLS: Record<string, string> = {
  date: "日",
  keywordId: "キーワード ID",
  searchQuery: "検索語句",
  cost: "費用",
};

function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const normalized = h.replace(/[\n\r\u3000]/g, " ").trim();
    map.set(normalized, i);
  });
  return map;
}

function getVal(
  row: string[],
  headerMap: Map<string, number>,
  colName: string
): string {
  const idx = headerMap.get(colName);
  if (idx === undefined) return "";
  return (row[idx] || "").trim();
}

function parseNum(val: string): number {
  const cleaned = val.replace(/[,%¥$]/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

/** 検索キーワードシート（費用集計用）を変換 */
export function transformAdKeywordData(rawData: string[][]): AdKeywordRow[] {
  if (rawData.length < 2) return [];

  const headerMap = createHeaderMap(rawData[0]);

  return rawData.slice(1).map((row) => ({
    date: getVal(row, headerMap, KW_COLS.date),
    keywordId: getVal(row, headerMap, KW_COLS.keywordId),
    keyword: getVal(row, headerMap, KW_COLS.keyword),
    cost: parseNum(getVal(row, headerMap, KW_COLS.cost)),
    impressions: parseNum(getVal(row, headerMap, KW_COLS.impressions)),
    clicks: parseNum(getVal(row, headerMap, KW_COLS.clicks)),
    conversions: parseNum(getVal(row, headerMap, KW_COLS.conversions)),
  }));
}

/** 検索語句シート（語句紐づけ用）を変換 */
export function transformAdSearchQueryData(
  rawData: string[][]
): AdSearchQueryRow[] {
  if (rawData.length < 2) return [];

  const headerMap = createHeaderMap(rawData[0]);

  return rawData.slice(1).map((row) => ({
    date: getVal(row, headerMap, SQ_COLS.date),
    keywordId: getVal(row, headerMap, SQ_COLS.keywordId),
    searchQuery: getVal(row, headerMap, SQ_COLS.searchQuery),
    cost: parseNum(getVal(row, headerMap, SQ_COLS.cost)),
  }));
}
