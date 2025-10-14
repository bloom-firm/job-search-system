'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Job } from '@/lib/types'
import JobCard from './JobCard'
import SearchBar, { SearchFilters } from './SearchBar'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatErrorMessage } from '@/lib/utils/errors'

const ITEMS_PER_PAGE = 24

// API Routeのレスポンス型定義
interface SearchJobsResponse {
  results: Job[]
  total: number
  page: number
  limit: number
}

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    salaryMin: 300,
    salaryMax: 2000,
    locations: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchJobs = useCallback(async (page: number = 1, isInitial: boolean = false) => {
    if (isInitial) {
      setIsInitialLoading(true)
    } else {
      setIsPageChanging(true)
    }
    setError(null)

    try {
      // キーワードを配列に変換
      const keywords = filters.keyword
        ? filters.keyword.trim().split(/\s+/).filter(k => k.length > 0)
        : []

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Searching with keywords:', keywords)
        console.log('📝 Filters:', filters)
        console.log('📄 Page:', page)
      }

      // 新しいAPI Routeを呼び出し
      const response = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          keywords,
          filters: {
            salaryMin: filters.salaryMin,
            salaryMax: filters.salaryMax,
            locations: filters.locations,
          },
          page,
          limit: ITEMS_PER_PAGE,
        }),
      })

      if (!response.ok) {
        // ステータスコード別のエラー処理
        if (response.status === 401) {
          throw new Error('認証が必要です。再度ログインしてください。')
        } else if (response.status === 429) {
          throw new Error('リクエストが多すぎます。しばらく待ってから再度お試しください。')
        } else if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.error || '検索条件が正しくありません。')
        }

        throw new Error('検索に失敗しました。')
      }

      const data: SearchJobsResponse = await response.json()

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ API Response:', {
          total: data.total,
          resultsCount: data.results.length,
          page: data.page,
        })
      }

      // 状態を更新
      setJobs(data.results)
      setTotalCount(data.total)

    } catch (error: unknown) {
      console.error('Error fetching jobs:', error)
      const errorMessage = formatErrorMessage(error, '求人情報の取得に失敗しました。')
      setError(errorMessage)
    } finally {
      setIsInitialLoading(false)
      setIsPageChanging(false)
    }
  }, [filters])

  useEffect(() => {
    setCurrentPage(1)
    fetchJobs(1, true)
  }, [fetchJobs])

  useEffect(() => {
    if (currentPage > 1) {
      fetchJobs(currentPage, false)
    }
  }, [currentPage, fetchJobs])

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  // ページ番号の配列を生成（最大10ページ表示）
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 10

    if (totalPages <= maxVisible) {
      // 全ページを表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // ページ数が多い場合は省略表示
      const leftSiblingIndex = Math.max(currentPage - 2, 1)
      const rightSiblingIndex = Math.min(currentPage + 2, totalPages)

      const shouldShowLeftDots = leftSiblingIndex > 2
      const shouldShowRightDots = rightSiblingIndex < totalPages - 1

      // 最初のページ
      pages.push(1)

      // 左側の省略
      if (shouldShowLeftDots) {
        pages.push('...')
      }

      // 現在のページ周辺
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }

      // 右側の省略
      if (shouldShowRightDots) {
        pages.push('...')
      }

      // 最後のページ
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">求人検索</h1>
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* ページ切り替え中のスピナー */}
      {isPageChanging && (
        <div className="flex justify-center items-center py-4 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 text-sm">ページを読み込み中...</span>
        </div>
      )}

      {/* 初回ローディング */}
      {isInitialLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 求人が見つからない */}
      {!isInitialLoading && !error && jobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            {filters.keyword
              ? `"${filters.keyword}" に一致する求人が見つかりませんでした。`
              : '求人情報がありません。'}
          </p>
        </div>
      )}

      {/* 求人一覧 */}
      {!isInitialLoading && !error && jobs.length > 0 && (
        <>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-gray-700">
              {filters.keyword && `"${filters.keyword}" の検索結果: `}
              <span className="font-semibold">{totalCount.toLocaleString()}件</span>の求人が見つかりました
              {totalCount > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({startIndex}-{endIndex}件目を表示)
                </span>
              )}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 mt-8">
              {/* ページ番号ボタン */}
              <div className="flex items-center gap-2">
                {/* 前へボタン */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPageChanging}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  前へ
                </button>

                {/* ページ番号 */}
                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span
                        key={`dots-${index}`}
                        className="px-3 py-2 text-gray-500"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        disabled={isPageChanging}
                        className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                {/* 次へボタン */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isPageChanging}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  次へ
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* ページ情報 */}
              <p className="text-sm text-gray-600">
                {totalPages}ページ中{currentPage}ページ目 | 全{totalCount.toLocaleString()}件
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}