/**
 * API レスポンスの共通型定義
 */

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export type ApiResult<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export interface SupabaseQueryResult<T> {
  data: T | null
  error: {
    message: string
    details?: string
    hint?: string
    code?: string
  } | null
}
