import { Applicant, RecruitCost } from "@/types/recruit";

/** 応募者（統合）シートの列マッピング */
const APP_COLS: Record<string, string> = {
  rowNo: "　",
  candidateId: "候補者ID",
  applicationDate: "応募日",
  status: "ステータス",
  careerType: "中途/新卒",
  nursery: "応募園",
  nurseryNote: "応募園備考",
  applicantName: "応募者",
  declineReason: "辞退、NG理由、備考",
  gender: "性別",
  employmentType: "雇用形態",
  jobType: "職種",
  qualification: "資格",
  recruitRoute: "採用ルート",
  agency: "媒体/会社",
  tourDate: "園見学日",
  interviewSetDate: "面接設定日",
  interviewDate: "面接日",
  offerAcceptedDate: "内定承諾済決定日",
  joinDate: "入職日",
  aggregateYearMonth: "集計用年月",
  offerCost: "内定承諾済コスト（税抜）",
};

/** 採用費（統合）シートの列マッピング */
const COST_COLS: Record<string, string> = {
  no: "NO",
  year: "利用年",
  month: "利用月",
  aggregateYearMonth: "集計用年月",
  agency: "媒体/会社",
  category: "区分け",
  area: "利用エリア",
  nursery: "利用園",
  jobType: "職種",
  employmentType: "雇用形態",
  amountExTax: "金額（税抜）",
  amountIncTax: "金額（税込）",
  startDate: "掲載開始日",
  endDate: "掲載終了日",
  paymentDate: "支払い予定日",
  applicantName: "求職者",
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
  const cleaned = val.replace(/[,%¥$,]/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

/** 応募者（統合）シートを変換 */
export function transformApplicants(rawData: string[][]): Applicant[] {
  if (rawData.length < 2) return [];

  const headerMap = createHeaderMap(rawData[0]);

  return rawData
    .slice(1)
    .filter((row) => {
      const date = getVal(row, headerMap, APP_COLS.applicationDate);
      return date !== "";
    })
    .map((row) => ({
      rowNo: getVal(row, headerMap, APP_COLS.rowNo),
      candidateId: getVal(row, headerMap, APP_COLS.candidateId),
      applicationDate: getVal(row, headerMap, APP_COLS.applicationDate),
      status: getVal(row, headerMap, APP_COLS.status),
      careerType: getVal(row, headerMap, APP_COLS.careerType),
      nursery: getVal(row, headerMap, APP_COLS.nursery),
      nurseryNote: getVal(row, headerMap, APP_COLS.nurseryNote),
      applicantName: getVal(row, headerMap, APP_COLS.applicantName),
      declineReason: getVal(row, headerMap, APP_COLS.declineReason),
      gender: getVal(row, headerMap, APP_COLS.gender),
      employmentType: getVal(row, headerMap, APP_COLS.employmentType),
      jobType: getVal(row, headerMap, APP_COLS.jobType),
      qualification: getVal(row, headerMap, APP_COLS.qualification),
      recruitRoute: getVal(row, headerMap, APP_COLS.recruitRoute),
      agency: getVal(row, headerMap, APP_COLS.agency),
      tourDate: getVal(row, headerMap, APP_COLS.tourDate),
      interviewSetDate: getVal(row, headerMap, APP_COLS.interviewSetDate),
      interviewDate: getVal(row, headerMap, APP_COLS.interviewDate),
      offerAcceptedDate: getVal(row, headerMap, APP_COLS.offerAcceptedDate),
      joinDate: getVal(row, headerMap, APP_COLS.joinDate),
      aggregateYearMonth: getVal(row, headerMap, APP_COLS.aggregateYearMonth),
      offerCost: getVal(row, headerMap, APP_COLS.offerCost),
    }));
}

/** 採用費（統合）シートを変換 */
export function transformRecruitCosts(rawData: string[][]): RecruitCost[] {
  if (rawData.length < 2) return [];

  const headerMap = createHeaderMap(rawData[0]);

  // ヘッダーに改行が含まれる列に対応
  // "掲載開始日\n（紹介・課金サイトは応募日）" → "掲載開始日 （紹介・課金サイトは応募日）"
  // "求職者\n※紹介・課金サイトの場合記載" → "求職者 ※紹介・課金サイトの場合記載"

  // 改行を含むヘッダーのため、部分一致でインデックスを探す
  const findCol = (partial: string): string => {
    let found = partial;
    headerMap.forEach((_, key) => {
      if (key.startsWith(partial)) found = key;
    });
    return found;
  };

  const startDateCol = findCol("掲載開始日");
  const endDateCol = findCol("掲載終了日");
  const paymentDateCol = findCol("支払い予定日");
  const applicantCol = findCol("求職者");

  return rawData
    .slice(1)
    .filter((row) => {
      const no = getVal(row, headerMap, COST_COLS.no);
      return no !== "" && !isNaN(Number(no));
    })
    .map((row) => ({
      no: getVal(row, headerMap, COST_COLS.no),
      year: getVal(row, headerMap, COST_COLS.year),
      month: getVal(row, headerMap, COST_COLS.month),
      aggregateYearMonth: getVal(row, headerMap, COST_COLS.aggregateYearMonth),
      agency: getVal(row, headerMap, COST_COLS.agency),
      category: getVal(row, headerMap, COST_COLS.category),
      area: getVal(row, headerMap, COST_COLS.area),
      nursery: getVal(row, headerMap, COST_COLS.nursery),
      jobType: getVal(row, headerMap, COST_COLS.jobType),
      employmentType: getVal(row, headerMap, COST_COLS.employmentType),
      amountExTax: parseNum(getVal(row, headerMap, COST_COLS.amountExTax)),
      amountIncTax: parseNum(getVal(row, headerMap, COST_COLS.amountIncTax)),
      startDate: getVal(row, headerMap, startDateCol),
      endDate: getVal(row, headerMap, endDateCol),
      paymentDate: getVal(row, headerMap, paymentDateCol),
      applicantName: getVal(row, headerMap, applicantCol),
    }));
}
