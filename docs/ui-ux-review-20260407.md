# SOU経営ダッシュボード UI/UXレビュー

**作成日:** 2026-04-07
**対象:** sou-dashboard 全13タブ
**前提:** 2026-04-01のデザイン改修（フラットカード/3トーン配色/角丸除去/余白強弱/ベストプラクティス適用）後の状態を評価

---

## 0. 現状の強み（維持すべき領域）

| 項目 | 評価 |
|------|------|
| 配色 | 3トーン（brand系/赤/グレー）に統一済み。異常値のみ赤で強調 |
| カードスタイル | `bg-white shadow-sm` フラット統一。角丸なし |
| デザイントークン | `globals.css` で Primitive/Semantic 2層化済み |
| スケルトン | `Skeleton.tsx` でCLS防止 |
| エラーハンドリング | `SectionErrorBoundary` 全タブ適用済み |
| URL同期 | タブ切替が searchParams で保持 |
| 期間フィルタ | `PeriodFilter` ポップオーバーカレンダー統一 |

---

## 1. ページ別課題

### 1.1 経営サマリー（ExecutiveSummaryView）

**現状セクション順序:**
1. InsightPanel（アラート＋プラス指標）
2. 直近30日KPI（MiniKPI×4）
3. 定員充足率（全体ゲージバー+年齢別）※本日実データ化完了
4. 年度累計 vs 前年度
5. エリア別パフォーマンステーブル

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| EXEC-1 | MiniKPIの装飾バー（`w-1 h-5 bg-brand-500 rounded-full` のカラーバー）が各セクション見出しに残存。他ビューは除去済みで不統一 | Medium |
| EXEC-2 | 定員充足率の全体ゲージと年齢別バーが別セクション。他ビュー（OccupancyView）とデータ構造が同じなのに見た目が違う | Low |
| EXEC-3 | エリア別テーブルに件数表示なし。DataTable化すると統一感向上 | Low |

---

### 1.2 週次レポート（WeeklyReportView）

**現状セクション順序:**
1. 週選択ボタン（直近12週）
2. 今週のサマリー（5KPI）
3. 直近30日問い合わせ状況（ScoreCards + ドーナツ + タイムライン + 積み上げ棒）
4. FY通年サマリー
5. FY月次推移
6. 0歳児エリア別
7. Google広告週次サマリー
8. 各園ステータス一覧
9. ブランド別入園数（条件付き）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| WR-1 | 9セクションが縦一列で長大（推定4,000px超）。TabGroup or CollapsibleSection で分割すべき | **High** |
| WR-2 | セクション6「0歳児エリア別」に `bg-red-50` の行色が残存（3トーン統一漏れ） | Medium |
| WR-3 | セクション見出しに全て装飾バー（`w-1 h-4 bg-brand-500 rounded-full`）付き。他ビューと不統一 | Medium |
| WR-4 | 週選択ボタンが12個横並び。モバイルでスクロール必要。PeriodFilterと統一すべき | Low |
| WR-5 | 各園ステータス一覧の sticky 左列は良いが、max-height 未設定で下まで一気にスクロール | Medium |

---

### 1.3 直近30日-園別 / 年度集計-園別 / 年度集計-月次別

**共通構成:** ScoreCards(7) → Filters → Charts(2列) → Tables

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| INQ-1 | 3タブがほぼ同一構造だが、タブタイトルだけで区別する必要あり。見出しに期間（例: "2026/3〜4"）明示すべき | Medium |
| INQ-2 | 検討中の表示色が gray-400 になり、視覚上「待ちリスト」と混ざって見える。ツールチップで補足が必要 | Low |

---

### 1.4 年度比較（ComparisonView）

**現状セクション順序:**
1. MonthlyComparisonChart（LineChart、直近3年度）
2. FYScoreTable（FY×10指標、前年比バッジ付き）
3. ComparisonTable（大規模ピボット: エリア×園×FY×3指標）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| COMP-1 | ComparisonTableが大規模ピボットだがヘッダー固定なし。横スクロール時にカラム見失う | **High** |
| COMP-2 | `getCellBg()` 関数がデッドコード化（すべて空文字を返す） | Low |
| COMP-3 | MonthlyComparisonChartのFY色が gray/brand/red系。前年=グレー、当年=brand、前々年=赤系は若干赤が目立ちすぎる | Low |

---

### 1.5 ブランド別（CompanyReportView）

**現状:** ブランド×園×月の大規模ピボットテーブル

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| BRAND-1 | ヒートマップ色をテキスト色に変更済みだが、`text-brand-700 font-semibold`（20%以上）は目立たない。凡例なしでは意図が伝わらない | Low |
| BRAND-2 | 合計行が bg-gray-50 で他ビューと統一済み ✅ | — |

---

### 1.6 Google広告（GoogleAdsView）

**現状セクション順序:**
1. FY選択ボタン
2. 月次広告パフォーマンステーブル
3. 件数/単価推移 ComposedChart
4. 問い合わせ一覧テーブル（ページネーション付き）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| ADS-1 | 指名/一般バッジが `bg-amber-100 text-amber-700` で残存。3トーン配色違反 | Medium |
| ADS-2 | 問い合わせ一覧テーブルにDataTable未使用。ソート・件数表示なし | Medium |
| ADS-3 | ComposedChartの右Y軸ラベル「単価」が小さく見にくい | Low |

---

### 1.7 GA4（GA4View）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| GA4-1 | エラー時バナーが `bg-red-50 border border-brand-200`（brand-200 on red 不自然） | Low |
| GA4-2 | チャネル別BarChartの棒色が `#008cc9/#f59e0b/#3b82f6` の3色。3トーン違反（amber/blue追加） | Medium |
| GA4-3 | 期間選択ボタンが独自実装。PeriodFilterに統一すべき | Low |

---

### 1.8 Google口コミ（ReviewsView）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| REV-1 | 現状多くのセクション（KPI/分布/ランキング/ベースライン/エリア別）が縦並び。CollapsibleSectionで折りたたむべき | **High** |
| REV-2 | 今月増加数のカウントが現在ほぼ0（current.json日次更新は自園のみ、週次で競合更新）。説明文で明示が必要 | Medium |

---

### 1.9 定員充足率（OccupancyView）※本日改修済み

**現状:** ゲージ + 異常値アラート + 園×年齢クラスピボットテーブル

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| OCC-1 | 本日の色簡素化（3トーン準拠）で改善済み ✅ | — |
| OCC-2 | `tfoot` の合計行がテーブル内に表示されるが、横スクロール時に下部で見失いがち | Low |
| OCC-3 | エリアフィルタが独自select。他ビューのFiltersコンポーネント（全体統一）と不一致 | Low |

---

### 1.10 採用レポート（RecruitReportView）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| RR-1 | `STATUS_GROUP_COLORS` が8色マップ。3トーン原則違反（応募/面接見学/合格/内定承諾/入社で複数色） | Medium |
| RR-2 | ドーナツチャート（応募経路別）が `COLORS` 8色パレット。ChannelDonutと共通化したい | Medium |
| RR-3 | 2つのCrosstabTable（園×ステータス、媒体×ステータス）で sticky 左列はあるが**ヘッダーは非sticky**。横スクロールで列がずれる | **High** |
| RR-4 | ドロップオフカード6枚 + 不採用カード1枚が別グリッドで配置。`grid-cols-3 md:grid-cols-6` + 1枚の不統一 | Low |
| RR-5 | BarChartの `margin={{ left: 80, right: 20 }}` ハードコード | Low |

---

### 1.11 採用費分析（RecruitCostView）

**課題:**

| ID | 問題 | 重要度 |
|----|------|-------|
| RC-1 | 合計カードのみ `border-gray-400 bg-gray-50`、他は `border-gray-200 bg-white` で不統一 | Low |
| RC-2 | 4パネル採用単価推移グリッドが同一形式4枚。CollapsibleSectionで折りたためるべき | Medium |
| RC-3 | `CATEGORY_COLORS` が `#2563EB/#60A5FA/#16A34A/#84CC16` の4色。brand系+グレーに統一すべき | Medium |

---

## 2. 全ページ共通の横断課題

### 2.1 セクション見出しの装飾バー

**問題:** `w-1 h-4/h-5 bg-brand-500 rounded-full` のカラーバーがWeeklyReport/GA4/Executive/Funnel/ChannelDonut等に残存。DashboardClient.tsxのメインタイトルでは既に除去済みで不統一。

**修正案:** 全セクション見出しから装飾バーを削除し、シンプルな `<h3 className="text-base font-bold text-gray-800 mb-3">` に統一。

**対象ファイル:** 11ファイル（全体一括置換可能）

---

### 2.2 チャートカラーパレットの統一漏れ

本日の修正でダッシュボード全体は3トーン配色になったが、以下のチャートで独自カラーが残存:

| ビュー | カラー | 修正方針 |
|-------|-------|---------|
| GA4View BarChart | `#008cc9/#f59e0b/#3b82f6` | brand-500/brand-300/gray-400 |
| RecruitReportView PieChart | 8色COLORS配列 | brand系グラデーション+グレー |
| RecruitCostView LineChart | 4色CATEGORY_COLORS | brand系+グレー |
| ComparisonView LineChart | gray/brand/red系 | brand-500/brand-300/gray-400 |

---

### 2.3 大規模ピボットテーブルの sticky header

**該当:**
- ComparisonView ComparisonTable
- RecruitReportView 園×ステータス
- RecruitReportView 媒体×ステータス

**問題:** sticky 左列はあるがヘッダー行がsticky未設定。横スクロール時に列が識別不能。

**修正案:** `<thead className="sticky top-0 z-10 bg-gray-50">` を追加。DataTable.tsxの既存パターンを流用。

---

### 2.4 情報密度コントロール（CollapsibleSection未活用）

**該当:** WeeklyReportView（9セクション）、ReviewsView（多数セクション）、RecruitCostView（月次チャート4枚）

**問題:** 縦長ページで「見つけたい情報へのスクロール量」が多い。CollapsibleSectionコンポーネントを作成して、二次情報を折りたたみ化すべき。

**新規コンポーネント仕様:**
```tsx
// src/components/ui/CollapsibleSection.tsx
interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}
// 折りたたみボタン + aria-expanded + chevron icon
```

---

### 2.5 DataTable 未活用

**該当:** GoogleAdsView 問い合わせ一覧、RecruitReportView Cost/Crosstab、OccupancyView

**問題:** DataTable（ソート/件数表示/スケルトン対応）があるのに手書きテーブルが多数。統一すれば「件数表示」「ソート」が自動で付与される。

---

### 2.6 フィルタUIの統一

**該当:**
- OccupancyView: エリア独自select
- GA4View: 期間選択独自ボタン
- RecruitReportView: 5つの独自select

**問題:** Filtersコンポーネント（全体統一済み）とFilterBarパターンに寄せるべき。

---

## 3. 実装優先順位

### 3.1 即時対応（各0.5-2h、合計~8h）

| # | 内容 | 対象 | 工数 |
|---|------|------|-----|
| **A-1** | セクション見出しの装飾バー一括除去 | 11ファイル | 1h |
| **A-2** | WeeklyReport セクション6の `bg-red-50` 除去 | WeeklyReportView | 0.5h |
| **A-3** | GoogleAds 指名/一般バッジを gray系に | GoogleAdsView | 0.5h |
| **A-4** | GA4 エラーバナーの brand-200 → red-200 修正 | GA4View | 0.5h |
| **A-5** | GA4/Recruit/Comparison/RecruitCost のチャート色を3トーン化 | 4ファイル | 2h |
| **A-6** | ComparisonView の `getCellBg()` デッドコード削除 | ComparisonView | 0.5h |
| **A-7** | 3タブ(recent/annual/fyMonthly)の見出しに期間明示 | DashboardClient | 1h |
| **A-8** | RecruitCost 合計カードのborder統一 | RecruitCostView | 0.5h |

### 3.2 中期対応（各2-4h、合計~14h）

| # | 内容 | 対象 | 工数 |
|---|------|------|-----|
| **B-1** | CollapsibleSection コンポーネント新規作成 | ui/CollapsibleSection.tsx | 2h |
| **B-2** | WeeklyReportView を CollapsibleSection で分割（日常チェック/深掘り） | WeeklyReportView | 3h |
| **B-3** | ReviewsView を CollapsibleSection で分割 | ReviewsView | 2h |
| **B-4** | 大規模ピボットに sticky header 追加（3テーブル） | Comparison/Recruit×2 | 3h |
| **B-5** | GoogleAds 問い合わせ一覧を DataTable 化 | GoogleAdsView | 2h |
| **B-6** | OccupancyView エリアフィルタを Filters コンポーネントに統一 | OccupancyView | 2h |

### 3.3 将来対応（各4h+、合計~10h）

| # | 内容 | 対象 | 工数 |
|---|------|------|-----|
| **C-1** | RecruitReport 2つのCrosstabTable を汎用 CrosstabTable コンポーネント化 | ui/CrosstabTable.tsx | 5h |
| **C-2** | 採用レポートの独自フィルタを共通 FilterBar パターンに統一 | RecruitReportView | 3h |
| **C-3** | WeeklyReport 週選択を PeriodFilter と統合（週選択モード追加） | PeriodFilter | 4h |

---

## 4. まとめ

**評価:** 本日の大規模改修により、SOU経営ダッシュボードは「フラットカード/3トーン配色/角丸なし」のベースラインが整い、Reservia参照のベストプラクティスの8割がカバーされました。

**残課題の性質:**
- 6割は**統一漏れ**（装飾バー/色/ボーダー/バッジ）→ 即時対応で解消可能
- 3割は**情報密度コントロール**（CollapsibleSection未導入）→ 中期対応
- 1割は**リファクタリング**（Crosstab汎用化等）→ 将来対応

**優先度の高い実装案（次セッション推奨）:**
1. **A-1** 装飾バー一括除去（最も影響範囲が広く視覚的に目立つ）
2. **A-5** チャート色の3トーン化（今日の改修の積み残し）
3. **B-4** 大規模ピボットに sticky header（横スクロール時のUX改善）
4. **B-1/B-2** CollapsibleSection導入 + WeeklyReport分割（長大ページの認知負荷軽減）

これらを実装すれば、ベストプラクティス準拠率が8割→95%に向上する見込みです。
