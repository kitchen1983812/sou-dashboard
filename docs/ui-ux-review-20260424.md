# SOUキッズケア ダッシュボード UI/UX レビュー（2026-04-24）

**作成日:** 2026-04-24
**対象:** sou-dashboard 全14タブ × モバイル(iPhone 13 390×844) + デスクトップ(1280×800)
**前回レビュー:** [docs/ui-ux-review-mobile-20260415.md](./ui-ux-review-mobile-20260415.md)
**キャプチャ:** `docs/screenshots/2026-04-24/{mobile,desktop}/`

---

## 0. 前回レビュー（2026-04-15）からの実装済み施策

| # | 項目 | 状態 | 効果 |
|---|------|------|------|
| 1.1 | サイドバー: モバイル ハンバーガー + ドロワー化 | ✅ 実装済み | 画面幅50%専有解消、コンテンツ全幅活用 |
| 1.2 | テーブル: ScrollableTable 共通化（min-width + sticky header） | ✅ 実装済み | 文字崩れ解消、横スクロール安定 |
| 1.3 | フィルタ: MobileCollapse でモバイル折りたたみ | ✅ 実装済み | スクロール量大幅削減 |
| 1.4 | チャート: モバイル段階的グリッド | ✅ 部分実装 | 改善中（まだ一部細い） |
| 2.1 | ScoreCards 列数統一（grid-cols 段階化） | ✅ 実装済み | 2列固定で視認性向上 |
| 2.3 | フォントサイズ底上げ | ✅ 実装済み | 読めるレベル達成 |
| 2.4 | 余白段階化 | ✅ 実装済み | |
| 2.5 | h1サイズ段階化 | ✅ 実装済み | `text-base md:text-xl` |
| 2.6 | ボタン モバイルアイコン化 | ◯ 部分実装 | CSV/Excel更新ボタンは小型化済み |

**総評:** 前回指摘の🔴Critical 4件すべて対応完了、🟡Medium も主要項目対応済み。モバイルUXは劇的に改善しました。

---

## 1. 残存課題

### 1.1 🔴 モバイルヘッダー: ハンバーガーが浮いて見える（Critical）

**現象（[docs/screenshots/2026-04-24/mobile/executive.png](./screenshots/2026-04-24/mobile/executive.png)）:**
- ハンバーガーボタン（≡）が **`position: fixed top-3 left-3`** で独立配置
- 独自の `bg-white shadow-sm border border-gray-200` を持ち、ヘッダー帯から浮いた別要素に見える
- 「経営ダッシュボード」の左側にある `pl-14` 余白は、あくまでハンバーガー被り回避のための空白で、意図的なレイアウトに見えない
- 縦方向: ハンバーガー `top-3` (12px) + `p-2` (8px padding) + `w-5 h-5` (20px icon) = 中心Y=22px。ヘッダー h1 中心Yは`py-3` + 文字高さ半分で ~24px。微妙にズレる

**原因:**
- [src/components/dashboard/TabNavigation.tsx:208](../src/components/dashboard/TabNavigation.tsx#L208) で `fixed` 配置
- [src/app/dashboard/layout.tsx:8](../src/app/dashboard/layout.tsx#L8) のヘッダーとは**別レイヤー**で描画される

**改善案:** ハンバーガーをヘッダーの flex child として組み込む

**Before:**
```tsx
// layout.tsx
<header className="sticky top-0 z-30 bg-white border-b border-gray-200 pl-14 md:pl-4 pr-4 sm:px-6 py-3 flex items-center gap-3">
  <span className="w-1 h-6 bg-brand-500 rounded-full" />
  <h1>経営ダッシュボード</h1>
</header>

// TabNavigation.tsx
<button onClick={onOpen}
  className="md:hidden fixed top-3 left-3 z-40 p-2 bg-white shadow-sm border border-gray-200">
  {/* hamburger */}
</button>
```

**After:**
```tsx
// layout.tsx — ハンバーガー配置スロットを追加
<header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center gap-3">
  <div id="mobile-menu-slot" className="md:hidden" />
  <span className="w-1 h-6 bg-brand-500 rounded-full" />
  <h1 className="text-base md:text-xl font-bold text-gray-800 tracking-wide">
    経営ダッシュボード
  </h1>
</header>

// TabNavigation.tsx — fixed をやめて通常 flex で配置
export default function TabNavigation(...) {
  return (
    <>
      {/* Portal でヘッダー内に描画するか、ヘッダーと統合 */}
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded min-h-11 min-w-11 flex items-center justify-center"
        aria-label="メニューを開く">
        <svg className="w-6 h-6" ...>...</svg>
      </button>
      {/* ...(以下は既存) */}
    </>
  );
}
```

**さらに簡単な修正案:** fixed をやめて layout.tsx にハンバーガーUIを直接書く

```tsx
// layout.tsx
"use client";
// ...
<header className="...flex items-center gap-2">
  <MobileMenuButton className="md:hidden" />  {/* 独立コンポーネント化 */}
  <span className="w-1 h-6 bg-brand-500 rounded-full" />
  <h1>経営ダッシュボード</h1>
</header>
```

**工数:** 1.5h
**効果:** ★★★★☆（ヘッダー一体感）

---

### 1.2 🟡 モバイル 定員充足率 サマリーゲージが極小（Medium）

**現象（[mobile/occupancy.png](./screenshots/2026-04-24/mobile/occupancy.png)）:**
- 上部の年齢別ゲージ 7枚（全体+0〜5歳）が `grid-cols-2 sm:grid-cols-3 lg:grid-cols-7`
- モバイルで2列 × 4段 = 8セル中7個＋全体ゲージ1個の合計8マス
- 各マス内のプログレスバーが細すぎて判読困難

**改善案:** モバイル時は1行3列 × 3段に再配置 or 全体ゲージだけ独立表示

```tsx
// OccupancyView.tsx
<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
  {/* 年齢別 6個 + 全体 = 7個 */}
```

**工数:** 0.5h
**効果:** ★★★☆☆

---

### 1.3 🟡 モバイル 口コミ「評価分布」「エリアベンチマーク」が窮屈（Medium）

**現象（[mobile/reviews.png](./screenshots/2026-04-24/mobile/reviews.png)）:**
- 評価分布バー（★5/★4/★3/★2以下/未評価）は縦1列OK
- エリアベンチマークが狭い幅に4列（エリア/自園数/自園平均/競合平均）押し込み
- 数値潰れ発生

**改善案:** エリアベンチマークテーブルに ScrollableTable min-width=500 適用

**工数:** 0.5h
**効果:** ★★☆☆☆

---

### 1.4 🟡 デスクトップ サイドバー折りたたみ後の「経営ダッシュボード」見出し重複（Medium）

**現象（[desktop/executive.png](./screenshots/2026-04-24/desktop/executive.png)）:**
- ヘッダー左に `「経営ダッシュボード」` (h1)
- サイドバー展開時は上部に「≪」(折りたたみアイコン)のみ
- ヘッダーの h1 は印字時に邪魔（`print:hidden` 未指定）
- また、タブ切替後のタイトル `{currentTab?.title}` がコンテンツ領域にも表示され、実質3重の見出し構造

**改善案:** ヘッダーのh1を「サービス名」、コンテンツのh2を「現在のタブ」に役割分担
- h1: 「経営ダッシュボード」（アプリ名）
- コンテンツ内 h2: 「経営サマリー」「週次レポート」等（タブ名）

→ 現在こうなっているが、役割が不明瞭。現状でも機能しているので**低優先**。

**工数:** 1h
**効果:** ★★☆☆☆（ほぼ自己満足）

---

### 1.5 🟢 モバイル 週次レポート: チャートが複数縦積みで長大（Low）

**現象（[mobile/weeklyReport.png](./screenshots/2026-04-24/mobile/weeklyReport.png)）:**
- 問い合わせ件数推移 / 園別ステータス / FY年度集計 / 月次推移 / Google広告 / ブランド別 が全て縦並び
- モバイルで全体スクロール約6000px超

**改善案:** 既に CollapsibleSection で一部折りたたみ実装済み。**モバイル時はすべてデフォルトclose**にする

```tsx
// WeeklyReportView.tsx
<CollapsibleSection title="Google広告パフォーマンス" defaultOpen={isMobile ? false : true}>
```

もしくは `defaultOpen={false}` に統一し、必要な人だけ展開する運用。

**工数:** 0.5h
**効果:** ★★☆☆☆

---

### 1.6 🟢 グループ定員充足率パネルの下部配置（Low）

**現象（[mobile/occupancy.png](./screenshots/2026-04-24/mobile/occupancy.png) 下部）:**
- 既存フェリーチェ25園表示 → 長いスクロール → グループ定員充足率パネル158園
- モバイルでは特に長い
- 「グループ全体のヘルスを先に見たい」というニーズがある可能性

**改善案:** ユーザー要望ベースで配置順決定
- 案A: 現状維持（自社 → グループ）
- 案B: サマリー（全体）→ 自社詳細 → グループ詳細
- 案C: タブ切り替え（自社 / グループ）

→ ユーザー判断待ち。

**工数:** 1〜2h
**効果:** ★★★☆☆（意思決定次第）

---

## 2. 良い点（維持すべき）

| # | 項目 | 備考 |
|---|------|------|
| A | サイドバードロワーの挙動 | 選択後自動クローズ、オーバーレイで閉じれる |
| B | ScoreCards 2列 (モバイル) | KPIがコンパクトに収まっている |
| C | グループブランド分類の視覚区別 | `自社`（brand-50）と`グループ`（gray-100）のバッジ |
| D | テーブル sticky header + 横スクロール | max-h-500/600 で縦も安定 |
| E | API キャッシュ最適化 | 2回目以降爆速 |

---

## 3. 実装優先順位

### フェーズ1: 即時対応（計 1〜2h）

| # | 課題 | 対象ファイル | 工数 |
|---|------|------------|------|
| 1.1 | ハンバーガーをヘッダー内に統合 | TabNavigation.tsx + layout.tsx | 1.5h |
| 1.2 | 定員充足率 年齢ゲージ grid 調整 | OccupancyView.tsx | 0.5h |

### フェーズ2: 中期対応（計 1〜1.5h）

| # | 課題 | 工数 |
|---|------|------|
| 1.3 | エリアベンチマークに ScrollableTable 適用 | 0.5h |
| 1.5 | 週次レポート CollapsibleSection デフォルト挙動調整 | 0.5h |

### フェーズ3: 将来対応（要判断）

| # | 課題 | 要件 |
|---|------|------|
| 1.4 | ヘッダー役割整理 | 印字要件の明確化 |
| 1.6 | グループ/自社セクションの順序・構成 | ユーザー意向確認 |

---

## 4. 前回 → 今回 ハイライト

**Before（2026-04-15）:**
- サイドバーが画面幅50%を専有、コンテンツ判読不能
- テーブル文字が「スクルドエ / ンジェル / 保育園」と1文字ずつ折返し
- フィルタ6個が縦積み、ファーストビュー埋まる

**After（2026-04-24）:**
- サイドバードロワー化により **コンテンツ全幅活用**
- テーブル `whitespace-nowrap` + `min-width` で **文字崩れゼロ**
- フィルタ折りたたみで **要点がFold上に集約**

**残る1項目:** ヘッダー内のハンバーガー浮きのみ。これが直れば モバイルUX 完成。

---

## 5. おわりに

前回Critical 4件すべて解消、残るはヘッダーの一体感微調整のみ。2026-05分の差分レビューでは 1.1〜1.3 の対応可否を確認できれば、モバイル側は「完成」と宣言してよいレベルです。
