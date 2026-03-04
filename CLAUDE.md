# CLAUDE.md — 問い合わせ分析ダッシュボード (ax-dashboard)

> Claude Code / AI開発エージェント向けプロジェクト指示書

## プロジェクト概要

AXコーポレーションのコーポレートサイト問い合わせデータ（Google スプレッドシート）を可視化するシングルページ分析ダッシュボード。

## 技術スタック

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS v3 + @tremor/react v3
- **Charts**: @tremor/react (AreaChart, DonutChart, BarChart)
- **Data**: Google Sheets API v4 (Service Account)
- **Auth**: なし（社内用）

## 主要ファイル

```
src/
├── lib/
│   ├── googleSheets.ts    — Google Sheets API接続（JWT認証）
│   └── transform.ts       — スプレッドシート→型変換
├── types/inquiry.ts       — TypeScript型定義
├── components/dashboard/  — ダッシュボードコンポーネント（6つ）
│   ├── SummaryCards.tsx   — サマリーカード×4
│   ├── TrendChart.tsx     — 月別推移（AreaChart）
│   ├── StatusChart.tsx    — ステータス（DonutChart）
│   ├── UtmChart.tsx       — UTM流入元（BarChart）
│   ├── AreaBarChart.tsx   — エリア別（BarChart）
│   └── InquiryTable.tsx   — 一覧テーブル（検索・フィルター・ページネーション）
└── app/
    ├── api/inquiries/route.ts  — APIルート（5分キャッシュ）
    └── dashboard/page.tsx      — メインページ（Server Component）
```

## データソース

- スプレッドシート: 【AXコーポレーション】コーポレートサイト問い合わせ
- シート名: `全データ`
- ID: `1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc`

## 環境変数（.env.local）

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc
```

## コマンド

```bash
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # プロダクションビルド
npm run lint     # Lint
```

## 注意事項

- GOOGLE_PRIVATE_KEYの`\n`はエスケープされた文字列のまま.env.localに記述する
- シート名変更時はAPIルート（route.ts）のデフォルト値を合わせて変更する
- 列名変更時はtransform.tsのCOLS定数を更新する
