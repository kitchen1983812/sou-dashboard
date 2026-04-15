# SOUキッズケア ダッシュボード UI/UX レビュー（モバイル重点）

**作成日:** 2026-04-15
**対象:** sou-dashboard 全14タブ × モバイル(iPhone 13 390×844) + デスクトップ(1280×800)
**前提:**
- 2026-04-07 実施レビュー（`docs/ui-ux-review-20260407.md`）以降の実装を前提
- Playwrightキャプチャ: `docs/screenshots/2026-04-15/{mobile,desktop}/`

---

## 0. Executive Summary

**モバイルUXの根本問題:** サイドバーが常時展開（`w-48` = 192px）で描画され、390px幅のモバイル画面の**約49%を専有**。コンテンツ領域が約200pxに圧縮され、ほぼ全タブで実用不能。ユーザー操作で毎回手動折りたたみが必要。

**最優先対応:** サイドバーのレスポンシブ対応（ハンバーガー + ドロワー化）。これ単体で体感UXが劇的に改善する。

| 重要度 | 件数 | 代表課題 |
|-------|------|---------|
| 🔴 Critical | 4 | サイドバー常時展開、テーブル崩れ、グラフ判読不能、フィルタ縦積み |
| 🟡 Medium | 6 | タップターゲット、フォントサイズ、余白、スコアカード列数、印字切れ、横スクロール固定ヘッダ |
| 🟢 Low | 3 | インサイトテキスト改行、tooltip、iOS sticky挙動 |

---

## 1. 全画面共通 — 最優先対応

### 1.1 🔴 サイドバーがモバイルで画面幅50%を占有（Critical）

**現状:**
- [src/components/dashboard/TabNavigation.tsx:84](../src/components/dashboard/TabNavigation.tsx#L84) で `w-48 shrink-0` 固定
- モバイル画面幅 390px のうち 192px（49%）がサイドバー
- コンテンツが 約200px に圧縮されテーブル・チャート・KPIが全て判読不能
- 折りたたみは手動（毎タブ切替後も残らない）

**Before（mobile 390px）:**
```
[サイドバー 192px][コンテンツ 198px]
├ 経営ダッシュ  │ 経営サマリー
├ 経営サマリー  │ ┌─KPI┐
├ 集客 ▼       │ │34│22│1│
├   週次...    │ ├──────┤
├   直近30日   │  (文字小)
└   ...        │
```

**After（推奨）:**
```
[☰ 経営ダッシュボード  ≡ タブ名]  ← ヘッダー固定
────────────────────────────────
コンテンツ 390px 全幅使用
 ┌─ KPI カード ─┐
 │ 34件        │
 │ 問い合わせ   │
 └─────────────┘
```

**改善案:**
1. `md:` breakpoint（768px）以上でのみ固定サイドバー表示
2. `md:` 未満はハンバーガーボタン + ドロワー（Sheet/Drawer）
3. タブ選択後は自動クローズ
4. 状態は `localStorage` で永続化（PC側の折りたたみは維持）

**変更対象:**
- [src/components/dashboard/TabNavigation.tsx](../src/components/dashboard/TabNavigation.tsx) 全面書き換え
- [src/components/dashboard/DashboardClient.tsx](../src/components/dashboard/DashboardClient.tsx) `flex` ラッパーの調整

**実装サンプル（TabNavigation.tsx 抜粋）:**
```tsx
export default function TabNavigation({ activeTab, onTabChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <>
      {/* モバイル用ハンバーガー（md未満でのみ表示） */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white shadow-sm"
        aria-label="メニューを開く"
      >
        <HamburgerIcon />
      </button>

      {/* モバイル用オーバーレイドロワー */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            className="w-64 h-full bg-white"
          >
            {/* 既存の TABS 描画、onTabChange で setMobileOpen(false) */}
          </nav>
        </div>
      )}

      {/* デスクトップ用サイドバー */}
      <nav className={`hidden md:flex ${desktopCollapsed ? "w-10" : "w-48"} ...`}>
        {/* 既存そのまま */}
      </nav>
    </>
  );
}
```

**工数:** 3-4h
**効果:** ★★★★★（モバイルUX根本改善）

---

### 1.2 🔴 テーブルがモバイルで横スクロール不能・文字潰れ（Critical）

**現状:**
- `recent / annual / fyMonthly / comparison / reviews` の園×月マトリックステーブル
- セル幅が極端に圧縮され、数値・園名が重なる
- 横スクロール設定（`overflow-x-auto`）はあるが、固定幅未設定で列幅が崩壊
- executive タブ下部の「エリア別パフォーマンス」も同じ症状（画面キャプチャで数値が1桁ずつ崩れている）

**改善案:**
1. テーブルに `min-w-[600px]` または `min-w-max` を指定して横スクロール前提に
2. 1列目（園名・エリア名）を sticky left（`sticky left-0 bg-white z-10`）
3. モバイル時はフォントサイズ `text-xs`、セル padding `px-2 py-1.5`
4. テーブル上部に「→ スクロールできます」のヒント（モバイルのみ）

**変更対象:**
- `ComparisonView.tsx` / `RecruitReportView.tsx` / `WeeklyReportView.tsx` 等の全テーブル
- 共通化: `src/components/ui/ScrollableTable.tsx`（ラッパー作成推奨）

**工数:** 4h（全テーブル対応）
**効果:** ★★★★★

---

### 1.3 🔴 フィルタパネルがモバイルで縦積みされスクロール量爆増（Critical）

**現状（googleAds タブキャプチャより）:**
- 企業 / 園 / エリア / ステータス / 期間 / 重複チェック 各select が **縦1列** に積まれる
- ファーストビューがフィルタだけで埋まり、データに到達するまで10スクロール以上
- タブ切替のたびに同じ操作が必要

**改善案:**
1. フィルタ全体を `CollapsibleSection` でデフォルト折りたたみ（モバイルのみ）
2. ヘッダーに現在のフィルタ状態を要約表示（例: 「全企業 / 全園 / FY26」）
3. デスクトップは現行の `grid grid-cols-3` 維持

**変更対象:**
- [src/components/dashboard/Filters.tsx](../src/components/dashboard/Filters.tsx)
- [src/components/ui/PeriodFilter.tsx](../src/components/ui/PeriodFilter.tsx)

**工数:** 2h
**効果:** ★★★★★

---

### 1.4 🔴 チャート/グラフがモバイルで判読不能（Critical）

**現状:**
- `reviews / recent / annual` のチャート群がモバイルで高さ不足（180px程度）
- 凡例と軸ラベルが重なって読めない
- ドーナツチャートと棒グラフが横並び → 両方とも細くなり判読不能

**改善案:**
1. モバイル時は1カラム固定（`grid-cols-1 md:grid-cols-2`）
2. チャート高さ モバイル 240px → デスクトップ 200px（相対的に広く）
3. Recharts `responsive` + `minWidth`指定
4. 凡例はチャート下部に改行配置（`legend.verticalAlign = 'bottom'`）

**変更対象:**
- [src/components/charts/ChannelDonut.tsx](../src/components/charts/ChannelDonut.tsx)
- [src/components/charts/TimelineChart.tsx](../src/components/charts/TimelineChart.tsx)
- [src/components/charts/AreaStackedBar.tsx](../src/components/charts/AreaStackedBar.tsx)

**工数:** 3h
**効果:** ★★★★☆

---

## 2. 重要度Medium

### 2.1 🟡 ScoreCards の列数が少なすぎ/多すぎ

**現状:**
- executive タブ: `grid-cols-5 lg:grid-cols-5` 固定 → モバイルで1枚の幅が38pxに圧縮
- staff タブ: `grid-cols-3` → モバイルでは2列が見やすい

**改善案:**
- 統一ルール: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- KPIが3個なら `grid-cols-1 sm:grid-cols-3`
- [src/components/dashboard/ScoreCards.tsx](../src/components/dashboard/ScoreCards.tsx) 含め全箇所統一

**工数:** 1h / **効果:** ★★★☆☆

### 2.2 🟡 タップターゲットが小さい（< 44px）

**現状:**
- ソート矢印 `↕` のクリック領域 ~24px
- フィルタ select の高さ 28px（py-1）
- サイドバーのタブボタン py-2（~32px高）

**改善案:**
- 全インタラクティブ要素に `min-h-11` (44px) 適用（iOS HIG準拠）
- 特にフィルタ select、ソートヘッダ、折りたたみボタン

**工数:** 1h / **効果:** ★★★☆☆

### 2.3 🟡 フォントサイズが小さい（モバイル）

**現状:**
- テーブル本文 `text-sm` (14px) → モバイルで文字が潰れる
- KPIサブテキスト `text-xs` (12px) → 判読困難
- キャプチャで「±○件 vs 前期」がほぼ読めない

**改善案:**
- モバイル時（`md:` 未満）は本文 16px、補助テキスト 14px を最低基準
- Tailwind で `text-[15px] md:text-sm` 等の手動指定か、`text-base md:text-sm` パターン

**工数:** 2h / **効果:** ★★★★☆

### 2.4 🟡 セクション間の余白が過剰

**現状:**
- `space-y-8` (32px) で縦スクロール量が膨大
- モバイルではさらに1カラム化するため累積スクロールが長大

**改善案:**
- モバイル時は `space-y-4 md:space-y-6 lg:space-y-8`
- カード内 padding も `p-3 md:p-5` に段階化

**工数:** 1h / **効果:** ★★☆☆☆

### 2.5 🟡 ヘッダー h1 が大きすぎてモバイルで2行折返し

**現状:**
- 「経営ダッシュボード」が `text-2xl font-bold` で 24px
- モバイルハンバーガー追加後はさらに横幅圧迫

**改善案:**
- モバイル時 `text-lg md:text-xl`
- 同時にヘッダー全体を `h-12` 固定化でスクロール時の揺れ防止

**工数:** 0.5h / **効果:** ★★☆☆☆

### 2.6 🟡 モバイルでボタンが全画面幅で冗長

**現状:**
- 「CSVを更新」「Excelを更新」がモバイルで全幅になり、隣のエリアフィルタと重なる
- ボタンのアイコンとテキストが折返す

**改善案:**
- モバイルではアイコンのみ + `aria-label`、`md:` 以上でテキスト表示
- フィルタとボタンを `flex-wrap gap-2` で柔軟配置

**工数:** 1h / **効果:** ★★★☆☆

---

## 3. 重要度Low

### 3.1 🟢 InsightPanel のテキストが長文で折り返し不自然

モバイルで「入園率0%（前期7.7%）→ 見学促進策の検討を」のような文が3行になり段落構造が崩れる。句読点で改行するか、bullet分割を推奨。

**工数:** 0.5h / **効果:** ★★☆☆☆

### 3.2 🟢 hover tooltip がタッチデバイスで見えない

ScoreCardのtooltipは hover 前提。モバイルでは長押し or タップで表示する必要。

**工数:** 1h / **効果:** ★★☆☆☆

### 3.3 🟢 iOS Safari の sticky header が 100vh スクロールで外れる

既知の iOS Safari 挙動。`position: sticky` + `overflow: auto` 親 + 固定高で回避。

**工数:** 1h / **効果:** ★☆☆☆☆

---

## 4. ページ別追加メモ

| タブ | 特記事項 |
|------|---------|
| executive | 1.1 + 2.1が支配的。モバイルで画面50%がサイドバーに支配され、残り50%にKPI5枚が並ぶため1枚38px |
| weeklyReport | 各ブロック縦並びで極長スクロール。`CollapsibleSection` 導入済みだが全体折りたたみもほしい |
| recent/annual | フィルタ + 統計 + テーブル全部モバイルで圧迫。1.3のCollapsible化必須 |
| fyMonthly | 同上 |
| comparison | 2年比較テーブルが特に横に長い。sticky左列が効果的 |
| googleAds | フィルタ + 月別パフォーマンス + チャート + 一覧。最もモバイル破綻度高い |
| ga4 | 相対的に良好。ScoreCards列数のみ |
| reviews | グループ園サマリー + 園別一覧 = 多テーブル。1.2のsticky+min-width必須 |
| occupancy | 園名列が縦書き状態に。列幅+横スクロール対応で解決 |
| staff | 比較的良好。ボタン表示のみ課題（2.6） |
| recruitReport | フィルタ階層深い。1.3と共通 |
| recruitCost | 小規模KPI中心で比較的良好 |

---

## 5. 実装優先順位

### フェーズ1: 即時対応（計 ~10h、体感UX劇的改善）

| # | 課題 | 対象 | 工数 |
|---|------|------|------|
| 1.1 | サイドバー: モバイルドロワー化 | TabNavigation.tsx | 3-4h |
| 1.3 | フィルタ: モバイル折りたたみ | Filters.tsx, PeriodFilter.tsx | 2h |
| 1.2 | テーブル: min-width + sticky左列 | 共通ラッパー新規 + 各テーブル | 4h |

### フェーズ2: 中期対応（計 ~6h、快適化）

| # | 課題 | 工数 |
|---|------|------|
| 1.4 | チャート モバイル1カラム化・高さ調整 | 3h |
| 2.3 | モバイルフォントサイズ底上げ | 2h |
| 2.6 | ボタン モバイルアイコン化 | 1h |

### フェーズ3: 将来対応（計 ~6h、品質向上）

| # | 課題 | 工数 |
|---|------|------|
| 2.1 | ScoreCards 列数統一 | 1h |
| 2.2 | タップターゲット44px保証 | 1h |
| 2.4 | 余白段階化 | 1h |
| 2.5 | h1サイズ段階化 | 0.5h |
| 3.1 | インサイトテキスト改行 | 0.5h |
| 3.2 | tooltip タップ対応 | 1h |
| 3.3 | iOS sticky対応 | 1h |

---

## 6. 共通コンポーネント新設提案

### 6.1 `ScrollableTable` ラッパー

```tsx
// src/components/ui/ScrollableTable.tsx
export function ScrollableTable({ children, minWidth = 600 }: Props) {
  return (
    <div className="relative">
      <div className="md:hidden text-xs text-gray-400 mb-1 text-right">
        ← 横スクロールできます →
      </div>
      <div className="overflow-auto max-h-[600px] border border-gray-100">
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}
```

### 6.2 `MobileCollapse` ラッパー（モバイルのみ折りたたみ）

```tsx
// src/components/ui/MobileCollapse.tsx
export function MobileCollapse({ summary, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="md:hidden">
        <button onClick={() => setOpen(!open)} className="w-full flex justify-between">
          <span>{summary}</span>
          <ChevronIcon className={open ? "rotate-180" : ""} />
        </button>
        {open && <div>{children}</div>}
      </div>
      <div className="hidden md:block">{children}</div>
    </>
  );
}
```

---

## 7. キャプチャ保全

今後の差分比較のため、Playwrightキャプチャを定期取得推奨:
- `npx tsx scripts/capture_screenshots.ts`（既存スクリプト）
- gitignore対象のため任意タイミング実行可
- 次回レビュー時は `2026-04-15` と差分を比較

---

## 8. 終わりに

**結論:** フェーズ1の3項目（サイドバー・フィルタ・テーブル）完了で体感UXは劇的改善する見込み。この3点は互いに独立しており並列着手可能。

**次のアクション:** フェーズ1から着手することを推奨。実装後に再度キャプチャ取得→差分レビューで効果検証。
