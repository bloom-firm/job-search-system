# 退避ファイル管理

このディレクトリには、アプリケーション本体から参照されていない、または移行完了済みのファイルを退避しています。

## 退避日時

2025-10-14

## 退避理由

Phase 1-2（フリー検索の精度向上）の実装完了後、コードベースをクリーンアップするため、以下のファイルを退避しました：

1. **一度きりの移行・セットアップスクリプト** - 既に実行完了済み
2. **public/pdf フォルダ** - 全てのPDFをSupabase Storageに移行済み
3. **未使用のデフォルトSVGファイル** - Next.jsの初期ファイルで実際には使用していない

## ディレクトリ構造

```
old/
├── scripts/          # 移行完了済みのスクリプト（19ファイル）
│   ├── check-*.js/ts/sql
│   ├── debug-*.js
│   ├── diagnose-*.ts
│   ├── investigate-*
│   ├── fix-*.sql
│   ├── create-*.sql
│   ├── import-*.js
│   ├── process-*.js
│   ├── link-*.ts
│   ├── migrate-*.ts
│   └── test-*
│
└── public/           # 未使用の静的ファイル
    ├── pdf/          # 旧PDFフォルダ（Supabase Storage移行済み）
    ├── window.svg
    ├── vercel.svg
    ├── next.svg
    ├── globe.svg
    └── file.svg
```

## scripts/ の内容

### 退避済みスクリプト一覧

| ファイル名 | 用途 | 実行済み |
|-----------|------|---------|
| check-jsonb-structure.sql | JSONB構造確認 | ✅ |
| check-pdf-existence.js/ts | PDF存在確認 | ✅ |
| check-pmo-title.sql | PMOタイトル確認 | ✅ |
| check-table-schema.js | テーブルスキーマ確認 | ✅ |
| create-companies-table.sql | 企業テーブル作成 | ✅ |
| debug-pdf-path.js | PDFパスデバッグ | ✅ |
| diagnose-pdf-setup.ts | PDFセットアップ診断 | ✅ |
| fix-pdf-titles.sql | PDFタイトル修正 | ✅ |
| import-companies-fixed.js | 企業データインポート | ✅ |
| investigate-pdf-titles.sql | PDFタイトル調査 | ✅ |
| investigate-search.js | 検索機能調査 | ✅ |
| link-jobs-to-pdfs.ts | 求人とPDFの紐付け | ✅ |
| migrate-pdf-mappings.ts | PDFマッピング移行 | ✅ |
| process-companies.js | 企業データ処理 | ✅ |
| test-limit.js | 制限テスト | ✅ |
| test-original-md-search.js | Markdown検索テスト | ✅ |

### 保持されているスクリプト（scripts/）

以下のスクリプトは `package.json` で使用されているため、`scripts/` に残しています：

- `upload-pdfs.mjs` - PDFアップロード
- `upload-pdfs-hashed.mjs` - ハッシュ付きPDFアップロード
- `add-search-indexes.sql` - 検索インデックス追加（Phase 2-1で使用予定）
- `upload-test-pdf.ts` - テスト用PDFアップロード

## public/ の内容

### 退避済み静的ファイル

- **public/pdf/** - 全てSupabase Storageに移行済み（0件）
- **window.svg** - Next.jsデフォルトファイル（未使用）
- **vercel.svg** - Next.jsデフォルトファイル（未使用）
- **next.svg** - Next.jsデフォルトファイル（未使用）
- **globe.svg** - Next.jsデフォルトファイル（未使用）
- **file.svg** - Next.jsデフォルトファイル（未使用）

## 戻す手順（必要な場合）

### スクリプトを戻す

```bash
# 特定のスクリプトを戻す場合
mv old/scripts/[ファイル名] scripts/

# 全てのスクリプトを戻す場合
mv old/scripts/* scripts/
```

### 静的ファイルを戻す

```bash
# PDFフォルダを戻す場合
mv old/public/pdf public/

# SVGファイルを戻す場合
mv old/public/*.svg public/
```

## 完全削除の前の確認事項

このディレクトリを完全に削除する前に、以下を確認してください：

1. ✅ アプリケーションが正常に動作している
2. ✅ 検索機能が正常に動作している
3. ✅ PDF表示機能が正常に動作している
4. ✅ 企業情報が正常に表示されている
5. ✅ 本番環境でも問題なく動作している

## 削除コマンド（慎重に実行）

```bash
# 完全に削除する場合（不可逆的な操作）
rm -rf old/
```

## 関連コミット

- Phase 1-1: API Route作成 (`src/app/api/search-jobs/route.ts`)
- Phase 1-2: JobList.tsx修正（Supabaseクライアント直接呼び出しを削除）
- ファイル整理: 未使用ファイルを `old/` に退避

## 注意事項

- このディレクトリのファイルは、アプリケーション本体から**参照されていません**
- 削除しても動作に影響はありませんが、念のため退避しています
- 将来的に参照が必要になった場合は、上記の「戻す手順」を参照してください
- 本番環境で1ヶ月以上問題なく動作した後、完全削除を検討してください
