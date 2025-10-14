/**
 * シンプルなメモリベースのレート制限
 * 本番環境ではUpstash RedisやVercel KVの使用を推奨
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

// メモリ内ストア（本番環境では Redis などに置き換える）
const store = new Map<string, RateLimitRecord>()

// 定期的にクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (record.resetAt < now) {
      store.delete(key)
    }
  }
}, 60000) // 1分ごと

export interface RateLimitConfig {
  /** リクエスト数の上限 */
  limit: number
  /** ウィンドウ時間（秒） */
  windowSeconds: number
}

export interface RateLimitResult {
  /** リクエストが許可されたか */
  allowed: boolean
  /** 残りのリクエスト数 */
  remaining: number
  /** リセット時刻（Unix timestamp） */
  resetAt: number
}

/**
 * レート制限をチェック
 * @param identifier ユーザーまたはIPアドレスなどの識別子
 * @param config レート制限の設定
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  let record = store.get(identifier)

  // レコードが存在しないか、期限切れの場合は新規作成
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs
    }
    store.set(identifier, record)
  }

  // リクエスト数をインクリメント
  record.count++

  const allowed = record.count <= config.limit
  const remaining = Math.max(0, config.limit - record.count)

  return {
    allowed,
    remaining,
    resetAt: record.resetAt
  }
}

/**
 * IPアドレスベースのレート制限を取得
 */
export function getRateLimitIdentifier(request: Request): string {
  // Vercelの場合は x-forwarded-for ヘッダーを使用
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // その他のヘッダーをチェック
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // フォールバック（開発環境など）
  return 'unknown'
}
