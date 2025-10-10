'use client'

import { useState } from 'react'
import { FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatErrorMessage } from '@/lib/utils/errors'

interface ProcessResult {
  success: boolean
  processed: number
  errors: string[]
}

export default function AdminCompaniesPage() {
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const handleProcess = async () => {
    setProcessing(true)
    setResult(null)
    setProgress({ current: 0, total: 0 })

    try {
      const response = await fetch('/api/companies/process', {
        method: 'POST',
      })

      const data: ProcessResult = await response.json()
      setResult(data)
      setProgress({ current: data.processed, total: data.processed })
    } catch (error: unknown) {
      const errorMessage = formatErrorMessage(error, '処理中にエラーが発生しました')
      setResult({
        success: false,
        processed: 0,
        errors: [errorMessage],
      })
    } finally {
      setProcessing(false)
    }
  }

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">企業データ管理</h1>
          <p className="text-gray-600">rawフォルダの企業データをJSON形式に一括変換します</p>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* 処理ボタン */}
          <div className="mb-6">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg font-medium"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  企業データ一括処理
                </>
              )}
            </button>
          </div>

          {/* 処理状況表示 */}
          {(processing || result) && (
            <div className="space-y-4">
              {/* 進捗表示 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">処理状況</span>
                  <span className="text-sm font-bold text-gray-900">
                    {progress.current} / {progress.total || '---'}
                  </span>
                </div>

                {/* プログレスバー */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {progress.total > 0 && (
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {Math.round(progressPercentage)}%
                  </div>
                )}
              </div>

              {/* 結果表示 */}
              {result && (
                <div className="space-y-4">
                  {/* 成功メッセージ */}
                  {result.success && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-green-800 font-medium">
                          処理が完了しました
                        </p>
                        <p className="text-green-700 text-sm">
                          {result.processed}件のファイルをJSON形式に変換しました
                        </p>
                      </div>
                    </div>
                  )}

                  {/* エラー表示 */}
                  {result.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <h3 className="text-red-800 font-medium">
                          エラーが発生しました ({result.errors.length}件)
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-white rounded border border-red-100"
                          >
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 break-all">{error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 処理済みファイル一覧 */}
                  {result.success && result.processed > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        処理済みファイル
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          {result.processed}個のファイルが正常に処理されました
                        </p>
                        <p className="text-xs text-gray-500">
                          保存先: src/data/companies/processed/
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 初期状態の説明 */}
          {!processing && !result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">処理内容</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>src/data/companies/raw フォルダ内の全txtファイルを読み込み</li>
                    <li>各ファイルをJSON構造に変換</li>
                    <li>src/data/companies/processed フォルダに保存</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
