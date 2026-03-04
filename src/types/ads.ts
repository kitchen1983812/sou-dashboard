/** 【AX】Google広告パフォーマンス - 検索キーワードレベル（費用集計用） */
export interface AdKeywordRow {
  date: string; // YYYY-MM-DD
  keywordId: string; // キーワード ID
  keyword: string; // 検索キーワード
  cost: number; // 費用（円）
  impressions: number; // 表示回数
  clicks: number; // クリック数
  conversions: number; // コンバージョン
}

/** 検索語句シート - 検索語句レベル（語句紐づけ用） */
export interface AdSearchQueryRow {
  date: string; // YYYY-MM-DD
  keywordId: string; // キーワード ID
  searchQuery: string; // 検索語句
  cost: number; // 費用（円）
}

/** 月次集計用 */
export interface AdMonthlySummary {
  month: string; // "9月" etc
  monthNum: number; // 9 etc (ソート用)
  year: number;
  adSpend: number; // 広告宣伝費
  conversions: number; // CV数（広告データのコンバージョン）
  cpa: number; // CPA（adSpend / conversions）
  inquiryCount: number; // 問い合わせ件数
  unitCost: number; // 単価（adSpend / inquiryCount）
}

/** 問い合わせ × キーワード紐づけ結果 */
export interface AdLinkedInquiry {
  no: number;
  postDate: string;
  nurseryName: string; // 問い合わせ園 (sheetName)
  keyword: string; // キーワード（utm_termから抽出）
  searchQuery: string; // 検索語句（広告データから紐づけ or "(不明)"）
  isBrand: boolean; // ブランドキーワードか
  childAge: string; // お子様年齢
  status: string; // ステータス
  keywordId: string | null; // 紐づけたキーワードID
}
