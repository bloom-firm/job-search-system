import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatErrorMessage } from '@/lib/utils/errors'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

const isDevelopment = process.env.NODE_ENV === 'development'

// ============================================
// 型定義
// ============================================

/**
 * 検索リクエストの型定義
 */
interface SearchJobsRequest {
  /** 検索キーワードの配列 */
  keywords?: string[]
  /** その他のフィルタ条件 */
  filters?: {
    salaryMin?: number
    salaryMax?: number
    locations?: string[]
    // 将来的に拡張可能
  }
  /** ページ番号（1から開始） */
  page?: number
  /** 1ページあたりの件数 */
  limit?: number
}

/**
 * 検索レスポンスの型定義
 */
interface SearchJobsResponse {
  /** 検索結果の配列 */
  results: Array<Record<string, unknown>>
  /** 総件数 */
  total: number
  /** 現在のページ番号 */
  page: number
  /** 1ページあたりの件数 */
  limit: number
}

/**
 * エラーレスポンスの型定義
 */
interface ErrorResponse {
  error: string
  details?: string
}

// ============================================
// キーワード正規化処理
// ============================================

/**
 * キーワードを正規化する
 * @param keyword 正規化するキーワード
 * @returns 正規化されたキーワード
 */
function normalizeKeyword(keyword: string): string {
  // 1. Unicode正規化(NFKC)で全角/半角を統一
  let normalized = keyword.normalize('NFKC')

  // 2. 記号を除去（ただし日本語のひらがな、カタカナ、漢字、英数字は保持）
  // 保持する文字: ひらがな(\u3040-\u309F), カタカナ(\u30A0-\u30FF), 漢字(\u4E00-\u9FAF), 英数字(a-zA-Z0-9)
  normalized = normalized.replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9\s]/g, '')

  // 3. 英字を小文字化
  normalized = normalized.toLowerCase()

  // 4. 前後の空白を削除
  normalized = normalized.trim()

  return normalized
}

// ============================================
// 入力値のバリデーション
// ============================================

/**
 * リクエストパラメータをバリデーションする
 * @param body リクエストボディ
 * @returns バリデーション結果とエラーメッセージ
 */
function validateRequest(body: SearchJobsRequest): { valid: boolean; error?: string; normalized?: { keywords: string[]; page: number; limit: number } } {
  const { keywords = [], page = 1, limit = 20 } = body

  // キーワードの配列チェック
  if (!Array.isArray(keywords)) {
    return { valid: false, error: 'keywords must be an array' }
  }

  // 空文字列を除外し、正規化
  const normalizedKeywords = keywords
    .filter(k => typeof k === 'string' && k.trim().length > 0)
    .map(normalizeKeyword)
    .filter(k => k.length > 0)

  // キーワード数の上限チェック（5個まで）
  if (normalizedKeywords.length > 5) {
    return { valid: false, error: 'Maximum 5 keywords allowed' }
  }

  // 各キーワードの長さ上限チェック（50文字まで）
  const tooLongKeyword = normalizedKeywords.find(k => k.length > 50)
  if (tooLongKeyword) {
    return { valid: false, error: 'Each keyword must be 50 characters or less' }
  }

  // ページ番号の検証
  const pageNum = Number(page)
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return { valid: false, error: 'page must be a positive integer' }
  }

  // limitの検証（50件まで）
  const limitNum = Number(limit)
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
    return { valid: false, error: 'limit must be between 1 and 50' }
  }

  return {
    valid: true,
    normalized: {
      keywords: normalizedKeywords,
      page: pageNum,
      limit: limitNum
    }
  }
}

// ============================================
// メインハンドラー
// ============================================

export async function POST(request: NextRequest) {
  try {
    if (isDevelopment) {
      console.log('🔍 [search-jobs] API called')
    }

    // 認証チェック（レート制限の前に実行してuser.idを取得）
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[search-jobs] Authentication failed')
      return NextResponse.json<ErrorResponse>(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // レート制限チェック（開発環境: 無効、本番環境: 30リクエスト/分）
    if (!isDevelopment) {
      // ユーザーIDベースの識別子を使用（より正確な制限）
      const rateLimitId = `user:${user.id}`
      const limitConfig = {
        limit: 30,
        windowSeconds: 60
      }
      const rateLimit = checkRateLimit(rateLimitId, limitConfig)

      if (!rateLimit.allowed) {
        console.error('[search-jobs] Rate limit hit:', rateLimitId)
        return NextResponse.json(
          { error: 'レート制限を超過しました。しばらくしてから再度お試しください。' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limitConfig.limit),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetAt),
            }
          }
        )
      }

      if (isDevelopment) {
        console.log('✅ [search-jobs] Rate limit check passed:', {
          id: rateLimitId,
          remaining: rateLimit.remaining
        })
      }
    } else {
      if (isDevelopment) {
        console.log('⚠️ [search-jobs] Rate limiting disabled in development')
      }
    }

    // リクエストボディの取得
    const body: SearchJobsRequest = await request.json()

    if (isDevelopment) {
      console.log('📝 [search-jobs] Request body:', body)
    }

    // 入力値のバリデーション
    const validation = validateRequest(body)
    if (!validation.valid) {
      console.error('[search-jobs] Validation error:', validation.error)
      return NextResponse.json<ErrorResponse>(
        { error: validation.error || 'Invalid request' },
        { status: 400 }
      )
    }

    const { keywords, page, limit } = validation.normalized!

    if (isDevelopment) {
      console.log('🔑 [search-jobs] Normalized keywords:', keywords)
      console.log('📄 [search-jobs] Page:', page, 'Limit:', limit)
    }

    // ============================================
    // Supabase検索クエリの実装
    // ============================================

    const offset = (page - 1) * limit

    // 総件数取得用のクエリ
    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })

    // データ取得用のクエリ
    let dataQuery = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // キーワードがある場合はAND条件で検索
    if (keywords.length > 0) {
      // original_md_contentに対して部分一致検索（AND条件）
      // 各キーワードがすべて含まれる必要がある
      keywords.forEach(keyword => {
        const pattern = `%${keyword}%`
        countQuery = countQuery.ilike('original_md_content', pattern)
        dataQuery = dataQuery.ilike('original_md_content', pattern)
      })
    }

    if (isDevelopment) {
      console.log('🔎 [search-jobs] Executing search query...')
    }

    // クエリの実行
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ])

    // エラーチェック
    if (countResult.error) {
      console.error('[search-jobs] Count query error:', countResult.error.message || countResult.error)
      throw countResult.error
    }

    if (dataResult.error) {
      console.error('[search-jobs] Data query error:', dataResult.error.message || dataResult.error)
      throw dataResult.error
    }

    const total = countResult.count || 0
    const results = dataResult.data || []

    if (isDevelopment) {
      console.log('✅ [search-jobs] Found', total, 'results')
      console.log('📦 [search-jobs] Returning', results.length, 'items for page', page)
    }

    // レスポンスを返す
    const response: SearchJobsResponse = {
      results,
      total,
      page,
      limit
    }

    return NextResponse.json(response)

  } catch (error: unknown) {
    // エラーハンドリング
    const errorMessage = formatErrorMessage(error, 'Search failed')
    console.error('[search-jobs] Fatal error:', errorMessage)

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Internal server error',
        details: isDevelopment ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
