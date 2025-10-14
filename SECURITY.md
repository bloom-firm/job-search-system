# セキュリティガイド

このドキュメントでは、Job Search Systemのセキュリティ実装と推奨事項をまとめています。

## 実装済みのセキュリティ機能

### 1. 認証・認可

- **Supabase Auth** を使用した認証
- **HttpOnly Cookie** による安全なセッション管理
- **Middleware** による全ルートの認証チェック
- **SupabaseListener** によるクライアント→サーバーのセッション同期

### 2. レート制限

以下のエンドポイントにレート制限を実装：

| エンドポイント | レート制限 | 理由 |
|---|---|---|
| `/api/find-pdf` | 10リクエスト/分 | DoS攻撃防止 |
| `/api/enrich-company` | 5リクエスト/分 | OpenAI APIコスト対策 |

レート制限ヘッダー：
- `X-RateLimit-Limit`: リクエスト上限
- `X-RateLimit-Remaining`: 残りリクエスト数
- `X-RateLimit-Reset`: リセット時刻（Unix timestamp）

### 3. ログ管理

- **開発環境のみ**デバッグログを出力（`NODE_ENV === 'development'`）
- 本番環境では機密情報（Cookie値、セッション情報）をログ出力しない
- エラーログは最小限の情報のみ

### 4. パストラバーサル対策

`/api/pdf-proxy` で実装：
- ディレクトリトラバーサル攻撃対策（`..`、`/`、`\`を禁止）
- `public/pdf/` ディレクトリ外へのアクセスを禁止
- シンボリックリンク解決と再検証

### 5. セキュリティヘッダー

`next.config.ts` で実装：

```typescript
{
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### 6. 入力検証

- すべてのAPIエンドポイントで必須パラメータをチェック
- 不正なリクエストには適切なエラーレスポンス（400 Bad Request）

### 7. CSRF対策

- Supabase AuthのCookieは `SameSite=Lax` で保護（推定）
- Next.jsの組み込みCSRF保護を活用

## 推奨事項

### 本番デプロイ前のチェックリスト

- [ ] 環境変数が`.env.local`に設定されている
- [ ] `.gitignore`に`.env*`が含まれている
- [ ] `NODE_ENV=production`で動作確認
- [ ] デバッグログが出力されないことを確認
- [ ] HTTPS接続を使用（Vercelは自動）
- [ ] Service Role Keyの使用箇所を確認

### レート制限の調整

本番環境でレート制限を調整する場合は、以下のファイルを編集：

#### `/api/find-pdf`
```typescript
// src/app/api/find-pdf/route.ts
const rateLimit = checkRateLimit(identifier, {
  limit: 10,  // ← ここを調整
  windowSeconds: 60
})
```

#### `/api/enrich-company`
```typescript
// src/app/api/enrich-company/route.ts
const rateLimit = checkRateLimit(identifier, {
  limit: 5,  // ← ここを調整
  windowSeconds: 60
})
```

### Redisベースのレート制限（推奨）

本番環境では、メモリベースではなくRedisベースのレート制限を推奨：

1. Upstash Redisをセットアップ
2. `@upstash/ratelimit`をインストール
3. `src/lib/rate-limit.ts`を以下に置き換え：

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
})
```

## Service Role Key の使用

### 現状

`/api/enrich-company`でService Role Keyを使用：

```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

### リスク

- Service Role KeyはRow Level Security (RLS)をバイパス
- 管理者権限を持つため、誤用すると危険

### 推奨対応

1. **RLSポリシーを設定**して、ANON_KEYでもアクセス可能にする
2. Service Role Keyの使用を最小限に留める
3. Service Role Keyを使用する場合は、追加の権限チェックを実装

```sql
-- companies_masterテーブルにRLSポリシーを追加
ALTER TABLE companies_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "認証済みユーザーは全企業情報を読み取り可能"
  ON companies_master FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "認証済みユーザーは企業情報を更新可能"
  ON companies_master FOR UPDATE
  USING (auth.uid() IS NOT NULL);
```

## PDF アクセスポリシー

### 公開PDF (`/api/pdf-proxy`)

- 認証なしでアクセス可能
- `public/pdf/` ディレクトリ配下のみ
- パストラバーサル対策実装済み

### プライベートPDF (`/api/find-pdf`)

- 認証必須
- Supabase Storageに保存
- 署名付きURL（1時間有効）で配信
- レート制限適用

**推奨**: 機密性の高いPDFはプライベートPDFとして管理

## 脆弱性報告

セキュリティ上の問題を発見した場合は、以下の手順で報告してください：

1. **公開しない**: GitHubのIssueやPull Requestに公開しない
2. **メール報告**: [セキュリティ担当者のメールアドレス] に報告
3. **詳細を記載**: 再現手順、影響範囲、推奨対応を含める

## 定期的なセキュリティチェック

以下を定期的に実施してください：

- [ ] 依存パッケージの脆弱性チェック（`npm audit`）
- [ ] Supabaseのセキュリティアップデート確認
- [ ] アクセスログの監視
- [ ] レート制限の効果確認
- [ ] 不要なログイン情報の削除

## 参考資料

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vercel Security](https://vercel.com/docs/security)

---

最終更新: 2025-10-14
