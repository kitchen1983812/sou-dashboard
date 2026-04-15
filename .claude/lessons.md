# Lessons Learned

## 2026-04-01: API route の型を使う前に route.ts を必ず確認する
- **何が起きたか:** ExecutiveSummaryView で occupancy API のレスポンスを `totalEnrolled` / `ages[]` で参照したが、実際は `capacity: number[6]` / `enrolled: number[6]` のタプル形式だった。デプロイ後にランタイムエラー発生。
- **なぜ間違えたか:** API route.ts を読まずに想像で型定義を書いた。
- **ルール:** 既存 API のレスポンスを使うコードを書く前に、必ず対応する `route.ts` の export interface / return 文を確認する。

## 2026-04-01: Math.min/Math.max に文字列を渡さない
- **何が起きたか:** PeriodFilter で `Math.min(getCurrentMonthStr(), maxMonth)` を書いたが、`YYYY-MM` 文字列に対して Math.min は使えない（TypeScript エラー）。
- **なぜ間違えたか:** 月文字列の比較に JavaScript の `<` `>` 演算子（文字列比較）を使うべきところを、数値関数を使った。
- **ルール:** `YYYY-MM` 形式の月文字列比較は `<` `>` 演算子で行う。Math.min/max は数値のみ。

## 2026-04-15: BrandRowのNurseryListと園別一覧テーブルが同一スクロールコンテナ内で視覚的に混在
- **何が起きたか:** ブランド別サマリーテーブル内でBrandRowを展開するとNurseryList(colSpan=7)が挿入され、直下の園別一覧テーブルと視覚的に連続。園別一覧のsticky thead + overflow-x-auto(overflow-y=visibleのデフォルト)で、展開行の最後数行が園別一覧の上に「張り付いた」ように見えた
- **なぜ間違えたか:** overflow-x-autoはoverflow-yに影響しないため、max-h指定してもy方向はvisibleで、テーブルがコンテナ外に溢れる。thead sticky top-0も親がscroll containerでなければ効かない
- **ルール:** ダッシュボードの大型テーブルでsticky theadを使う場合は必ず`overflow-auto`(両軸) + `max-h-*`指定。1コンポーネント内に複数テーブルを並べる時は視覚的分離(明確なborder/margin)を確保
