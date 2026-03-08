/** 問い合わせデータ（スプレッドシート1行 → 1オブジェクト） */
export interface Inquiry {
  id: string;
  adminEmail: string;
  responseStatus: string;
  postDate: string;
  postModified: string;
  postTitle: string;
  birth: string;
  birthDate: string;
  birthMonth: string;
  birthYear: string;
  birth2: string;
  contact: string;
  contactTime: string;
  first: string;
  line: string;
  nursery: string;
  second: string;
  subject: string;
  tel: string;
  third: string;
  utmCampaign: string;
  utmContent: string;
  utmMedium: string;
  utmSource: string;
  utmTerm: string;
  why: string;
  email: string;
  furigana: string;
  content: string;
  name: string;
  memo: string;
  area: string;
  duplicateCheck: string;
  status: string;
  company: string;
  sheetName: string;
  rowNumber: string;
}

/** タブID */
export type TabId =
  | "recent"
  | "annual"
  | "fyMonthly"
  | "comparison"
  | "report"
  | "googleAds"
  | "weeklyReport"
  | "recruitReport"
  | "recruitCost"
  | "ga4";

/** タブ定義 */
export interface TabDef {
  id: TabId;
  label: string;
  title: string;
}

/** フィルター状態 */
export interface FilterState {
  company: string;
  nursery: string;
  area: string;
  contactMethod: string;
  status: string;
  duplicateCheck: string;
}

/** スコアカード（7指標） */
export interface ScoreCardData {
  totalInquiries: number;
  enrollments: number;
  unanswered: number;
  inProgress: number;
  underConsideration: number;
  waitlisted: number;
  declined: number;
  enrollmentRate: number;
  unansweredRate: number;
  declineRate: number;
}

/** スコアカード（前期比較付き） */
export interface ScoreCardWithComparison extends ScoreCardData {
  prevTotalInquiries?: number;
  prevEnrollments?: number;
  prevUnanswered?: number;
  prevInProgress?: number;
  prevUnderConsideration?: number;
  prevWaitlisted?: number;
  prevDeclined?: number;
}

/** 月別ステータス集計 */
export interface MonthlyStatusData {
  month: string;
  [status: string]: string | number;
}

/** 経路データ */
export interface ChannelData {
  channel: string;
  count: number;
}

/** エリア別ステータス集計 */
export interface AreaStatusData {
  area: string;
  [status: string]: string | number;
}

/** 比較テーブル行 */
export interface ComparisonRow {
  area: string;
  nurseryName: string;
  [key: string]: string | number;
}

/** ステータス × エリア クロス集計 */
export interface StatusAreaCrosstab {
  area: string;
  連絡つかない: number;
  辞退: number;
  未対応: number;
  諸事情: number;
  待ちリスト: number;
  対応中: number;
  入園: number;
  total: number;
}
