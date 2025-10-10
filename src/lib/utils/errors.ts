/**
 * エラーメッセージをフォーマットするユーティリティ関数
 * @param error - キャッチされたエラーオブジェクト
 * @param defaultMessage - デフォルトのエラーメッセージ
 * @returns フォーマットされたエラーメッセージ
 */
export function formatErrorMessage(error: unknown, defaultMessage = '予期しないエラーが発生しました'): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return defaultMessage
}

/**
 * エラーをコンソールにログ出力するユーティリティ関数
 * @param context - エラーが発生したコンテキスト
 * @param error - エラーオブジェクト
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}
