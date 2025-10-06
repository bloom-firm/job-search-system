'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Job } from '@/lib/types/job'
import JobCard from './JobCard'
import SearchBar, { SearchFilters } from './SearchBar'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 24

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    salaryMin: 300,
    salaryMax: 2000,
    locations: [],
    jobType: '',
    industry: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    setCurrentPage(1)
    fetchJobs(1, true)
  }, [filters])

  useEffect(() => {
    if (currentPage > 1) {
      fetchJobs(currentPage, false)
    }
  }, [currentPage])

  const fetchJobs = async (page: number = 1, isInitial: boolean = false) => {
    if (isInitial) {
      setIsInitialLoading(true)
    } else {
      setIsPageChanging(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      const offset = (page - 1) * ITEMS_PER_PAGE

      // サンプルデータを出力
      const { data: sample } = await supabase.from('jobs').select('title, salary_min, salary_max').limit(3)
      console.log('DBの年収データ:', sample)

      // 件数取得のクエリ
      let countQuery = supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })

      // データ取得のクエリ
      let dataQuery = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1)

      // フリーワード検索の実装
      if (filters.keyword) {
        const searchCondition = `company_name.ilike.%${filters.keyword}%,title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%,location.ilike.%${filters.keyword}%,job_type.ilike.%${filters.keyword}%,industry_category.ilike.%${filters.keyword}%`
        countQuery = countQuery.or(searchCondition)
        dataQuery = dataQuery.or(searchCondition)
      }

      // 年収範囲フィルタ - デバッグ中
      if (filters.salaryMin > 300 || filters.salaryMax < 2000) {
        const salaryMinValue = filters.salaryMin
        const salaryMaxValue = filters.salaryMax

        console.log('フィルタ条件:', { salaryMinValue, salaryMaxValue })

        // パターンA: 現在のロジック
        countQuery = countQuery.lte('salary_min', salaryMaxValue).gte('salary_max', salaryMinValue)
        dataQuery = dataQuery.lte('salary_min', salaryMaxValue).gte('salary_max', salaryMinValue)

        // パターンB: 順序入れ替え（テスト時はAをコメントアウトしてBを有効化）
        // countQuery = countQuery.gte('salary_max', salaryMinValue).lte('salary_min', salaryMaxValue)
        // dataQuery = dataQuery.gte('salary_max', salaryMinValue).lte('salary_min', salaryMaxValue)

        // パターンC: 条件なし（テスト時はAをコメントアウトしてCを有効化）
        // 何もしない
      }

      // 勤務地フィルタ
      if (filters.locations.length > 0) {
        const locationConditions = filters.locations.map(loc => `location.ilike.%${loc}%`).join(',')
        countQuery = countQuery.or(locationConditions)
        dataQuery = dataQuery.or(locationConditions)
      }

      // 職種フィルタ（titleとjob_typeの両方を検索）
      if (filters.jobType) {
        const jobTypeCondition = `title.ilike.%${filters.jobType}%,job_type.ilike.%${filters.jobType}%`
        countQuery = countQuery.or(jobTypeCondition)
        dataQuery = dataQuery.or(jobTypeCondition)
      }

      // 業界フィルタ
      if (filters.industry) {
        countQuery = countQuery.ilike('industry_category', `%${filters.industry}%`)
        dataQuery = dataQuery.ilike('industry_category', `%${filters.industry}%`)
      }

      // 並列で実行
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ])

      if (countResult.error) throw countResult.error
      if (dataResult.error) throw dataResult.error

      const newJobs = dataResult.data || []
      const total = countResult.count || 0

      setJobs(newJobs)
      setTotalCount(total)
    } catch (err: any) {
      console.error('Error fetching jobs:', err)
      setError(err.message || '求人情報の取得に失敗しました。')
    } finally {
      setIsInitialLoading(false)
      setIsPageChanging(false)
    }
  }

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