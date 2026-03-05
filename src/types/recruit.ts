/** 応募者データ（応募者（統合）シート 1行 → 1オブジェクト） */
export interface Applicant {
  rowNo: string;
  candidateId: string;
  applicationDate: string; // "YYYY/MM/DD"
  status: string;
  careerType: string; // 中途/新卒
  nursery: string; // 応募園
  nurseryNote: string;
  applicantName: string;
  declineReason: string;
  gender: string;
  employmentType: string; // 正社員/パート等
  jobType: string; // 保育士/調理師等
  qualification: string;
  recruitRoute: string; // 採用ルート
  agency: string; // 媒体/会社
  tourDate: string; // 園見学日
  interviewSetDate: string;
  interviewDate: string;
  offerAcceptedDate: string;
  joinDate: string; // 入職日
  aggregateYearMonth: string; // 集計用年月
  offerCost: string; // 内定承諾済コスト（税抜）
}

/** 採用費データ（採用費（統合）シート 1行 → 1オブジェクト） */
export interface RecruitCost {
  no: string;
  year: string;
  month: string;
  aggregateYearMonth: string;
  agency: string; // 媒体/会社
  category: string; // 区分け
  area: string;
  nursery: string;
  jobType: string;
  employmentType: string;
  amountExTax: number;
  amountIncTax: number;
  startDate: string;
  endDate: string;
  paymentDate: string;
  applicantName: string;
}

/** 採用ファネルデータ */
export interface RecruitFunnelData {
  total: number;
  documentPass: number; // 書類選考通過
  tourInterview: number; // 見学・面接
  passed: number; // 合格
  offerAccepted: number; // 内定承諾(採用)
  joined: number; // 入社
  // ドロップオフ
  documentFail: number; // 書類選考落ち
  preTourDecline: number; // 見学前辞退
  postTourDecline: number; // 見学後辞退
  preInterviewDecline: number; // 面接前辞退
  postInterviewDecline: number; // 面接後辞退
  postOfferDecline: number; // 内定後辞退
  rejected: number; // 不採用
}

/** 採用ルート別集計 */
export interface RouteBreakdown {
  route: string;
  count: number;
  percentage: number;
}

/** 園別応募集計 */
export interface NurseryApplicationData {
  nursery: string;
  count: number;
}

/** 月次応募/採用推移 */
export interface MonthlyRecruitTrend {
  month: string; // "4月" etc
  monthNum: number;
  year: number;
  applications: number;
  hires: number;
  prevApplications?: number;
  prevHires?: number;
}

/** 採用ルート別コスト */
export interface RouteCostData {
  route: string;
  cost: number;
  hires: number;
  unitCost: number;
}

/** 媒体/会社別コスト */
export interface AgencyCostData {
  agency: string;
  route: string;
  cost: number;
  hires: number;
  unitCost: number;
}

/** 園×ステータスグループ クロス集計 */
export interface NurseryStatusCrosstab {
  nursery: string;
  応募: number;
  面接見学: number;
  合格: number;
  内定: number;
  入社: number;
  辞退: number;
  不採用: number;
  その他: number;
  total: number;
}

/** 媒体×ステータスグループ クロス集計 */
export interface AgencyStatusCrosstab {
  agency: string;
  応募: number;
  面接見学: number;
  合格: number;
  内定: number;
  入社: number;
  辞退: number;
  不採用: number;
  その他: number;
  total: number;
}

/** 採用費サマリー行 */
export interface CostSummaryRow {
  category: string; // "保育:正社員" etc
  cost: number;
  hires: number;
  unitCost: number;
}

/** 採用費月次推移 */
export interface MonthlyCostTrend {
  month: string;
  monthNum: number;
  year: number;
  cost: number;
  hires: number;
  unitCost: number;
}

/** 採用フィルター状態 */
export interface RecruitFilterState {
  nursery: string;
  recruitRoute: string;
  agency: string;
  jobType: string;
  employmentType: string;
}
