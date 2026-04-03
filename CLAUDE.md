# CLAUDE.md — 問い合わせ分析ダッシュボード (sou-dashboard)

> Claude Code / AI開発エージェント向けプロジェクト指示書

## プロジェクト概要

SOUキッズケア（認可・認証保育施設運営 37園）のコーポレートサイト問い合わせデータを可視化するシングルページ分析ダッシュボード。Google スプレッドシートからデータ取得し、経営サマリー・集客分析・運営・採用の4カテゴリでKPI管理。

## 技術スタック

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS v3（カスタム brand カラー #008cc9）
- **Charts**: Recharts + カスタム SVG（FunnelChart, GaugeChart, DualAxisChart）
- **Data**: Google Sheets API v4 (Service Account) + Google Places API (口コミ)
- **Auth**: Basic認証（middleware.ts、Vercel環境変数 BASIC_AUTH_USER/BASIC_AUTH_PASS）
- **Deploy**: Vercel（`/sou-deploy` Skill 参照）
- **Lint**: Biome (format) + oxlint (lint)、lefthook pre-commit

## コマンド

```bash
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # プロダクションビルド（prebuildで.next削除）
npm run lint     # Lint
```

## 主要ディレクトリ

```
src/
├── app/
│   ├── api/
│   │   ├── inquiries/route.ts  — 問い合わせデータ（Google Sheets、5分キャッシュ）
│   │   ├── reviews/route.ts    — Google口コミ（Places API、24hキャッシュ）
│   │   ├── occupancy/route.ts  — 定員充足率（園児数シート）
│   │   └── ga4/route.ts        — GA4データ
│   └── dashboard/
│       ├── page.tsx            — メインページ（Server Component）
│       └── loading.tsx         — スケルトンローダー
├── components/
│   ├── dashboard/              — ビューコンポーネント（22ファイル）
│   │   ├── DashboardClient.tsx — メインクライアント（タブ/フィルタ/URL同期）
│   │   ├── TabNavigation.tsx   — サイドバーナビ（経営/集客/運営/採用）
│   │   ├── ScoreCards.tsx      — KPIカード7枚 + RateChip
│   │   ├── ExecutiveSummaryView.tsx — 経営サマリー（InsightPanel + 充足率）
│   │   ├── ReviewsView.tsx     — Google口コミ KPI
│   │   ├── OccupancyView.tsx   — 定員充足率（園別×年齢クラス）
│   │   └── ...                 — 他16ビュー
│   ├── ui/                     — 汎用UIコンポーネント
│   │   ├── ScoreCard.tsx       — KPIカード（tooltip/invertColor対応）
│   │   ├── DataTable.tsx       — ソート可能テーブル（件数表示付き）
│   │   ├── PeriodFilter.tsx    — 月選択ポップオーバーカレンダー
│   │   ├── SectionErrorBoundary.tsx
│   │   └── Skeleton.tsx
│   └── charts/                 — カスタムチャート
│       ├── DualAxisChart.tsx   — 二軸複合チャート（Recharts）
│       ├── FunnelChart.tsx     — SVGグラデーションバー
│       └── GaugeChart.tsx      — 半円ゲージ
├── config/reviewConfig.ts      — 口コミ Place ID・ベースライン設定
├── lib/
│   ├── dashboardUtils.ts       — 集計・フィルタ・ステータス定義・TABS配列
│   ├── googleSheets.ts         — Google Sheets API接続（JWT認証）
│   └── transform.ts            — スプレッドシート→型変換
├── styles/globals.css           — CSSデザイントークン（Primitive/Semantic 2層）
└── types/                       — TypeScript型定義
```

## デザイン方針

- **配色**: 3トーン（brand系=ポジティブ / 赤=要アクション / グレー=その他）
- **カード**: フラット白 + shadow-sm、角丸なし
- **背景**: bg-gray-50（白カードが映える）
- **余白**: ブロック間 space-y-8 / ブロック内 space-y-4
- **色のシンプルさ**: ベースカラー（白/グレー）を大部分に。色は異常値のみ
- **チャート色**: brand系グラデーション + グレー（ドーナツ・積み上げ棒ともに統一）

## データソース

| シート | スプレッドシートID | 用途 |
|--------|------------------|------|
| 全データ | GOOGLE_SHEET_ID | 問い合わせ（主データ） |
| 園児数 | GOOGLE_SHEET_ID_OCCUPANCY | 定員充足率 |
| Google広告 | GOOGLE_SHEET_ID_ADS | 広告パフォーマンス |
| 採用 | GOOGLE_SHEET_ID_RECRUIT | 採用費・採用レポート |

## 口コミスナップショット

- **ベースライン**: `baseline-20260328`（reviewConfig.ts に設定）
- **日次更新**: GitHub Actions 毎日 23:00 JST（`.github/workflows/snapshot-reviews.yml`）
- **ファイル**: `public/snapshots/current.json`（自園+競合）+ `YYYY-MM-DD.json`（自園のみ）

## 注意事項

- **重複チェック**: デフォルトフィルタ `duplicateCheck: "-"`。集計時は重複除外が必須
- GOOGLE_PRIVATE_KEY の `\n` はエスケープされた文字列のまま .env.local に記述する
- シート名変更時は API ルート（route.ts）のデフォルト値を合わせて変更する
- 列名変更時は transform.ts の COLS 定数を更新する
- ブランド名マッピング: `dashboardUtils.ts` の `normalizeBrandName()`（アルコバレーノ→フェリーチェ等）
- `vercel env add` 時は `printf` で値を渡す（`echo` だと末尾改行混入）
