# PDF Storage Migration Guide

このドキュメントは、PDFファイルをローカル（`public/pdf/`）からSupabase Storageに移行する手順を説明します。

## 📋 移行の概要

### 変更内容
- **Before**: PDFファイルは `public/pdf/` フォルダに格納
- **After**: PDFファイルはSupabase Storageの `pdfs` バケットに格納
- **メタデータ**: `pdf-mapping.json` → `pdf_mappings` テーブル（Supabase）

### 影響範囲
以下のファイルが更新されました：
1. `src/app/api/find-pdf/route.ts` - Supabase StorageからPDFを取得
2. `src/app/jobs/[id]/page.tsx` - 署名付きURLでPDFを表示
3. `src/app/components/JobCard.tsx` - 動的にPDF URLを取得
4. `scripts/migrate-pdf-mappings.ts` - マイグレーションスクリプト（新規）

---

## 🛠️ セットアップ手順

### 1. Supabaseテーブルの作成

Supabase SQL Editorで以下のSQLを実行してください：

```sql
-- pdf_mappingsテーブルを作成
CREATE TABLE pdf_mappings (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  pdf_filename TEXT NOT NULL UNIQUE,
  original_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを追加（検索高速化）
CREATE INDEX idx_pdf_mappings_company_job ON pdf_mappings(company_name, job_title);
CREATE INDEX idx_pdf_mappings_filename ON pdf_mappings(pdf_filename);

-- RLS（Row Level Security）を有効化
ALTER TABLE pdf_mappings ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーの読み取りを許可
CREATE POLICY "Allow authenticated users to read pdf_mappings"
  ON pdf_mappings
  FOR SELECT
  TO authenticated
  USING (true);
```

### 2. Supabase Storageバケットの作成

Supabase Dashboardで以下の手順を実行：

1. **Storage** セクションに移動
2. **Create a new bucket** をクリック
3. バケット名: `pdfs`
4. **Public bucket**: ❌（チェックを外す - プライベートバケット）
5. **File size limit**: 10MB（推奨）
6. **Allowed MIME types**: `application/pdf`
7. **Create bucket** をクリック

### 3. Storageポリシーの設定

Supabase Dashboard > Storage > pdfs > Policies で以下のポリシーを追加：

```sql
-- 認証済みユーザーがPDFを読み取れるように設定
CREATE POLICY "Allow authenticated users to read PDFs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'pdfs');

-- 管理者のみアップロード可能（必要に応じて）
CREATE POLICY "Allow admin to upload PDFs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdfs' AND
    auth.jwt() ->> 'role' = 'service_role'
  );
```

### 4. PDFファイルのアップロード

#### オプションA: Supabase Dashboardから手動アップロード

1. Storage > pdfs バケットを開く
2. **Upload file** をクリック
3. ハッシュ化されたPDFファイル（例: `01b77760aa9bdb26e224c415bb776550.pdf`）を選択してアップロード

#### オプションB: スクリプトでバッチアップロード

以下のスクリプトを作成して実行：

```typescript
// scripts/upload-pdfs-to-storage.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ハッシュ化されたPDFファイルがあるディレクトリ
  const pdfDir = path.join(process.cwd(), 'hashed-pdfs') // 適宜変更
  const files = await fs.readdir(pdfDir)

  for (const file of files) {
    if (!file.endsWith('.pdf')) continue

    const filePath = path.join(pdfDir, file)
    const fileBuffer = await fs.readFile(filePath)

    const { error } = await supabase.storage
      .from('pdfs')
      .upload(file, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) {
      console.error(`❌ Failed to upload ${file}:`, error)
    } else {
      console.log(`✅ Uploaded ${file}`)
    }
  }
}

main()
```

実行方法：
```bash
npx tsx scripts/upload-pdfs-to-storage.ts
```

### 5. pdf_mappingsテーブルにデータを投入

以下のコマンドでマイグレーションスクリプトを実行：

```bash
npx tsx scripts/migrate-pdf-mappings.ts
```

このスクリプトは `pdf-mapping.json` を読み込み、Supabaseの `pdf_mappings` テーブルにデータを投入します。

#### 実行結果の確認

- ✅ 成功: `pdf_mappings` テーブルにレコードが作成される
- ❌ エラー: `pdf-migration-errors.json` にエラーログが出力される

### 6. 環境変数の確認

`.env.local` ファイルに以下の環境変数が設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🧪 動作確認

### 1. find-pdf APIのテスト

```bash
curl -X POST http://localhost:3000/api/find-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "companyName": "ALL DIFFERENT株式会社",
    "jobTitle": "【SE｜PLポジション｜ベンダーコントロール】自社開発システムエンジニア"
  }'
```

期待されるレスポンス：
```json
{
  "success": true,
  "filename": "01b77760aa9bdb26e224c415bb776550.pdf",
  "originalPath": "ALL DIFFERENT株式会社/【SE｜PLポジション｜ベンダーコントロール】自社開発システムエンジニア.pdf",
  "url": "https://your-project.supabase.co/storage/v1/object/sign/pdfs/01b77760aa9bdb26e224c415bb776550.pdf?token=...",
  "matchType": "exact"
}
```

### 2. ブラウザでの動作確認

1. 開発サーバーを起動: `npm run dev`
2. ログイン後、求人一覧ページにアクセス
3. 任意の求人カードの「PDF表示」ボタンをクリック
4. 新しいタブでPDFが表示されることを確認

---

## 🔧 トラブルシューティング

### エラー: "PDF not found"

**原因**: pdf_mappingsテーブルにレコードが存在しない

**解決策**:
1. `pdf_mappings` テーブルを確認: `SELECT * FROM pdf_mappings WHERE company_name = 'XXX' AND job_title = 'YYY';`
2. データがない場合は、マイグレーションスクリプトを再実行: `npx tsx scripts/migrate-pdf-mappings.ts`

### エラー: "Failed to generate PDF URL"

**原因**: Supabase Storageにファイルが存在しない、またはポリシー設定の問題

**解決策**:
1. Supabase Dashboard > Storage > pdfs でファイルが存在するか確認
2. Storageポリシーを確認（上記の「Storageポリシーの設定」を参照）
3. ファイルがない場合は、PDFファイルを再アップロード

### エラー: "認証が必要です"

**原因**: ユーザーがログインしていない

**解決策**:
1. `/login` ページでログイン
2. セッションが有効か確認: Supabase Dashboardの Authentication > Users

### 署名付きURLの有効期限切れ

**現在の設定**: 署名付きURLは1時間有効

**調整方法**: `src/app/api/find-pdf/route.ts` の以下の行を変更
```typescript
.createSignedUrl(mapping.pdf_filename, 3600) // 3600秒 = 1時間
```

---

## 📊 パフォーマンス最適化

### 1. キャッシング戦略

PDF URLをキャッシュして、APIコールを削減：

```typescript
// クライアント側でのキャッシュ例
const pdfUrlCache = new Map<string, string>()

async function getCachedPdfUrl(companyName: string, jobTitle: string) {
  const key = `${companyName}:${jobTitle}`

  if (pdfUrlCache.has(key)) {
    return pdfUrlCache.get(key)
  }

  const response = await fetch('/api/find-pdf', {
    method: 'POST',
    body: JSON.stringify({ companyName, jobTitle })
  })

  const data = await response.json()

  if (data.success) {
    pdfUrlCache.set(key, data.url)
  }

  return data.url
}
```

### 2. インデックスの最適化

大量のPDFがある場合は、追加のインデックスを検討：

```sql
-- 部分一致検索用（GINインデックス）
CREATE INDEX idx_pdf_mappings_job_title_gin
  ON pdf_mappings USING gin (job_title gin_trgm_ops);
```

---

## 🔄 ロールバック手順

万が一、元の `public/pdf/` システムに戻す必要がある場合：

1. 以下のファイルをgitで元に戻す：
   ```bash
   git checkout HEAD~1 src/app/api/find-pdf/route.ts
   git checkout HEAD~1 src/app/jobs/[id]/page.tsx
   git checkout HEAD~1 src/app/components/JobCard.tsx
   ```

2. `public/pdf/` フォルダが存在することを確認

3. 開発サーバーを再起動

---

## 📝 注意事項

1. **PDFファイル名**: ハッシュ化されたファイル名（例: `01b77760aa9bdb26e224c415bb776550.pdf`）を使用
2. **セキュリティ**: 署名付きURLは一定時間で無効化されるため、永続的なリンクとしては使用不可
3. **バックアップ**: 移行前に `public/pdf/` フォルダのバックアップを推奨
4. **コスト**: Supabase Storageの料金プランを確認（Free tierは1GB、Pro tierは100GBまで無料）

---

## ✅ チェックリスト

- [ ] Supabaseに `pdf_mappings` テーブルを作成
- [ ] Supabaseに `pdfs` バケットを作成
- [ ] Storageポリシーを設定
- [ ] PDFファイルをSupabase Storageにアップロード
- [ ] `npx tsx scripts/migrate-pdf-mappings.ts` を実行
- [ ] 環境変数を設定（`.env.local`）
- [ ] 開発環境で動作確認
- [ ] 本番環境にデプロイ前に再度テスト

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：
- Supabase Dashboard > Logs でエラーログを確認
- ブラウザのコンソールでJavaScriptエラーを確認
- `pdf-migration-errors.json` でマイグレーションエラーを確認
