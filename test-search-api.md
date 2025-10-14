# Search API Test Documentation

## API Endpoint
`POST http://localhost:3001/api/search-jobs`

## Implementation Summary

### ✅ Completed Features

1. **Type Definitions** (Lines 11-48)
   - `SearchJobsRequest`: リクエストの型定義
   - `SearchJobsResponse`: レスポンスの型定義
   - `ErrorResponse`: エラーレスポンスの型定義

2. **Keyword Normalization** (Lines 55-73)
   - `normalizeKeyword()` 関数
   - Unicode正規化 (NFKC) で全角/半角を統一
   - 記号を除去（日本語・英数字は保持）
   - 英字を小文字化
   - 前後の空白を削除

3. **Input Validation** (Lines 80-134)
   - `validateRequest()` 関数
   - キーワード数上限: 5個まで
   - キーワード長上限: 50文字まで
   - limit上限: 50件まで
   - 空文字列の除外

4. **Rate Limiting** (Lines 151-167)
   - 30リクエスト/分の制限
   - `X-RateLimit-*` ヘッダーでクライアントに情報提供

5. **Authentication** (Lines 169-180)
   - Supabase認証チェック
   - 未認証の場合は401エラー

6. **Supabase Search Query** (Lines 219-245)
   - AND条件検索（全キーワードを含む）
   - `original_md_content` カラムに対してILIKE検索
   - ページネーション実装（offset/limit）
   - 総件数の取得

7. **Error Handling** (Lines 265-277)
   - すべてのエラーをキャッチ
   - 開発環境では詳細なエラーログを出力
   - 本番環境ではエラー詳細を非表示

## Test Request Example

### 基本的な検索リクエスト
```bash
curl -X POST http://localhost:3001/api/search-jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxxxx-auth-token=xxxxx" \
  -d '{
    "keywords": ["IT", "コンサル"],
    "page": 1,
    "limit": 20
  }'
```

### Expected Response
```json
{
  "results": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

## Keyword Normalization Examples

| Input | Normalized Output |
|-------|------------------|
| "IT　コンサル" | "itコンサル" |
| "Ｗｅｂ デザイナー" | "webデザイナー" |
| "プログラマー！！" | "プログラマー" |
| "  Java  " | "java" |
| "Python/Ruby" | "pythonruby" |

## Validation Rules

### Valid Requests
✅ `{"keywords": ["IT", "コンサル"], "page": 1, "limit": 20}`
✅ `{"keywords": [], "page": 1, "limit": 50}`
✅ `{"keywords": ["プログラマー"], "page": 2, "limit": 10}`

### Invalid Requests
❌ `{"keywords": ["a", "b", "c", "d", "e", "f"], ...}` - 6個のキーワード（上限5個）
❌ `{"keywords": ["very_long_keyword_over_50_characters..."], ...}` - 50文字超過
❌ `{"keywords": ["IT"], "limit": 100}` - limit上限超過（最大50）
❌ `{"keywords": ["IT"], "page": 0}` - 無効なページ番号

## Performance Considerations

現在の実装:
- シンプルなILIKE検索（インデックス未使用）
- 複数キーワードの場合、複数のILIKE条件をチェーン
- Phase 2で全文検索インデックスを使った最適化を予定

## Security Features

1. **Rate Limiting**: 30リクエスト/分
2. **Authentication**: Supabase認証必須
3. **Input Validation**: すべての入力値を検証
4. **Error Sanitization**: 本番環境ではエラー詳細を非表示

## Next Steps (Phase 1-2)

Phase 1-2では:
- `JobList.tsx` のクライアント側コードを修正
- 10バッチループを削除
- この新しいAPIエンドポイントを呼び出すように変更
- クライアント側のフィルタリング処理を削除
