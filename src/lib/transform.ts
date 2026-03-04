import { Inquiry } from "@/types/inquiry";

function normalizeHeader(header: string): string {
  return header
    .replace(/[\r\n]+/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    map.set(normalizeHeader(header), index);
  });
  return map;
}

function getVal(
  row: string[],
  headerMap: Map<string, number>,
  key: string
): string {
  const index = headerMap.get(key);
  if (index === undefined || index >= row.length) return "";
  const raw = (row[index] || "").trim();
  if (raw.startsWith("#")) return "";
  return raw;
}

/** スプレッドシートの列名定数 */
const COLS = {
  id: "ID",
  adminEmail: "管理者メール送信先",
  responseStatus: "対応状況",
  postDate: "post_date",
  postModified: "post_modified",
  postTitle: "post_title",
  birth: "birth",
  birthDate: "birth-date",
  birthMonth: "birth-month",
  birthYear: "birth-year",
  birth2: "birth2",
  contact: "contact",
  contactTime: "contact-time",
  first: "first",
  line: "line",
  nursery: "nursery",
  second: "second",
  subject: "subject",
  tel: "tel",
  third: "third",
  utmCampaign: "utm_campaign",
  utmContent: "utm_content",
  utmMedium: "utm_medium",
  utmSource: "utm_source",
  utmTerm: "utm_term",
  why: "why",
  email: "メールアドレス",
  furigana: "ふりがな",
  content: "内容",
  name: "氏名",
  memo: "メモ",
  area: "エリア",
  duplicateCheck: "重複チェック",
  status: "ステータス",
  company: "企業",
  sheetName: "シート名",
  rowNumber: "行数",
} as const;

/**
 * スプレッドシートの生データを型付きInquiry配列に変換する
 * 1行目をヘッダーとして扱う
 */
export function transformInquiries(rawData: string[][]): Inquiry[] {
  if (rawData.length < 2) return [];

  const headerMap = createHeaderMap(rawData[0]);

  return rawData.slice(1).map((row) => ({
    id: getVal(row, headerMap, COLS.id),
    adminEmail: getVal(row, headerMap, COLS.adminEmail),
    responseStatus: getVal(row, headerMap, COLS.responseStatus),
    postDate: getVal(row, headerMap, COLS.postDate),
    postModified: getVal(row, headerMap, COLS.postModified),
    postTitle: getVal(row, headerMap, COLS.postTitle),
    birth: getVal(row, headerMap, COLS.birth),
    birthDate: getVal(row, headerMap, COLS.birthDate),
    birthMonth: getVal(row, headerMap, COLS.birthMonth),
    birthYear: getVal(row, headerMap, COLS.birthYear),
    birth2: getVal(row, headerMap, COLS.birth2),
    contact: getVal(row, headerMap, COLS.contact),
    contactTime: getVal(row, headerMap, COLS.contactTime),
    first: getVal(row, headerMap, COLS.first),
    line: getVal(row, headerMap, COLS.line),
    nursery: getVal(row, headerMap, COLS.nursery),
    second: getVal(row, headerMap, COLS.second),
    subject: getVal(row, headerMap, COLS.subject),
    tel: getVal(row, headerMap, COLS.tel),
    third: getVal(row, headerMap, COLS.third),
    utmCampaign: getVal(row, headerMap, COLS.utmCampaign),
    utmContent: getVal(row, headerMap, COLS.utmContent),
    utmMedium: getVal(row, headerMap, COLS.utmMedium),
    utmSource: getVal(row, headerMap, COLS.utmSource),
    utmTerm: getVal(row, headerMap, COLS.utmTerm),
    why: getVal(row, headerMap, COLS.why),
    email: getVal(row, headerMap, COLS.email),
    furigana: getVal(row, headerMap, COLS.furigana),
    content: getVal(row, headerMap, COLS.content),
    name: getVal(row, headerMap, COLS.name),
    memo: getVal(row, headerMap, COLS.memo),
    area: getVal(row, headerMap, COLS.area),
    duplicateCheck: getVal(row, headerMap, COLS.duplicateCheck),
    status: getVal(row, headerMap, COLS.status),
    company: getVal(row, headerMap, COLS.company),
    sheetName: getVal(row, headerMap, COLS.sheetName),
    rowNumber: getVal(row, headerMap, COLS.rowNumber),
  }));
}
