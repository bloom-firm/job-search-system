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
    locations: []
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

      // フィルタ条件の全体ログ
      console.log('=== 検索条件 ===')
      console.log('フィルタ:', JSON.stringify(filters, null, 2))

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

      // フリーワード検索の実装（LIKE検索 - 広範囲取得）
      // 複数キーワードのAND検索はクライアント側で実施
      const searchKeywords = filters.keyword ? filters.keyword.trim().split(/\s+/).filter(k => k.length > 0) : []
      let currentSearchCondition = '' // バッチ取得用に検索条件を保存

      // キーワード検索がある場合は、他のフィルタを適用せずにキーワードのみで検索
      // クライアント側で全てのフィルタリングを行う
      if (searchKeywords.length > 0) {
        console.log('🔍 検索キーワード（AND検索）:', searchKeywords)

        // まずは全キーワードをOR条件で広範囲に取得
        // クライアント側で後からAND条件でフィルタリング
        const allSearchConditions: string[] = []

        searchKeywords.forEach(keyword => {
          allSearchConditions.push(
            `title.ilike.%${keyword}%`,
            `company_name.ilike.%${keyword}%`,
            `description.ilike.%${keyword}%`,
            `requirements.ilike.%${keyword}%`,
            `preferred_skills.ilike.%${keyword}%`,
            `location.ilike.%${keyword}%`,
            `job_type.ilike.%${keyword}%`,
            `industry_category.ilike.%${keyword}%`,
            `employment_type.ilike.%${keyword}%`,
            `original_md_content.ilike.%${keyword}%`  // 元のMarkdown内容も検索対象に追加
          )
        })

        currentSearchCondition = allSearchConditions.join(',')
        console.log('📊 DB検索条件（OR）:', currentSearchCondition)

        // まずは広範囲に取得（OR検索）
        countQuery = countQuery.or(currentSearchCondition)
        dataQuery = dataQuery.or(currentSearchCondition)

        // キーワード検索時は他のフィルタをDB側で適用しない
        console.log('⚠️ キーワード検索時：他のフィルタはクライアント側で適用')
      } else {
        // キーワード検索がない場合のみ、他のフィルタをDB側で適用

        // 年収範囲フィルタ
        if (filters.salaryMin > 300 || filters.salaryMax < 2000) {
          const salaryMinValue = filters.salaryMin
          const salaryMaxValue = filters.salaryMax

          console.log('✓ 年収フィルタ適用:', { salaryMinValue, salaryMaxValue })

          countQuery = countQuery.lte('salary_min', salaryMaxValue).gte('salary_max', salaryMinValue)
          dataQuery = dataQuery.lte('salary_min', salaryMaxValue).gte('salary_max', salaryMinValue)
        } else {
          console.log('✗ 年収フィルタなし')
        }

        // 勤務地フィルタ
        if (filters.locations.length > 0) {
          console.log('✓ 勤務地フィルタ適用:', filters.locations)
          const locationConditions = filters.locations.map(loc => `location.ilike.%${loc}%`).join(',')
          countQuery = countQuery.or(locationConditions)
          dataQuery = dataQuery.or(locationConditions)
        } else {
          console.log('✗ 勤務地フィルタなし')
        }

        // キーワード検索なしの場合はページネーション適用
        console.log(`📄 ページネーション適用: ${offset}〜${offset + ITEMS_PER_PAGE - 1}`)
        dataQuery = dataQuery.range(offset, offset + ITEMS_PER_PAGE - 1)
      }

      // キーワード検索時は複数ページに分けて取得（Supabaseの1000件制限対策）
      let newJobs: any[] = []
      let countResult: any = null // スコープ外で定義

      if (searchKeywords.length > 0) {
        console.log('⚠️ キーワード検索時：複数ページで全件取得（1000件制限回避）')

        // Supabaseは1クエリで最大1000件しか取得できないため、
        // 複数回に分けて取得する
        const BATCH_SIZE = 1000
        let hasMore = true
        let batchNumber = 0

        while (hasMore && batchNumber < 10) { // 最大10,000件まで（10バッチ）
          const batchOffset = batchNumber * BATCH_SIZE
          console.log(`📦 バッチ${batchNumber + 1}取得中 (${batchOffset}〜${batchOffset + BATCH_SIZE - 1})...`)

          const batchQuery = supabase
            .from('jobs')
            .select('*')
            .or(currentSearchCondition) // 検索条件を再適用
            .order('created_at', { ascending: false })
            .range(batchOffset, batchOffset + BATCH_SIZE - 1)

          const { data: batchData, error: batchError } = await batchQuery

          if (batchError) throw batchError

          if (batchData && batchData.length > 0) {
            newJobs = [...newJobs, ...batchData]
            console.log(`   ✓ ${batchData.length}件取得 (累計: ${newJobs.length}件)`)

            // 1000件未満なら最後のバッチ
            if (batchData.length < BATCH_SIZE) {
              hasMore = false
            }
          } else {
            hasMore = false
          }

          batchNumber++
        }

        console.log(`🎯 DB取得完了: 合計${newJobs.length}件`)
      } else {
        // キーワード検索なしの場合は通常通り
        const [countRes, dataResult] = await Promise.all([
          countQuery,
          dataQuery
        ])

        countResult = countRes // 外部スコープに代入

        if (countResult.error) throw countResult.error
        if (dataResult.error) throw dataResult.error

        newJobs = dataResult.data || []
      }

      // DB取得後のデバッグログ
      if (searchKeywords.length > 0) {
        console.log('DB取得データサンプル:', newJobs.slice(0, 3).map(j => ({
          title: j.title,
          company: j.company_name,
          requirements: j.requirements?.substring(0, 100)
        })))
      }

      // クライアント側でAND検索フィルタリング
      if (searchKeywords.length > 0) {
        console.log('🔄 クライアント側フィルタリング開始')
        console.log('検索キーワード:', searchKeywords)

        const beforeCount = newJobs.length

        newJobs = newJobs.filter(job => {
          // 1. キーワードAND検索：全てのキーワードが、いずれかのカラムに含まれている必要がある
          const keywordMatch = searchKeywords.every(keyword => {
            const regex = new RegExp(keyword, 'i')

            const match = (
              regex.test(job.title || '') ||
              regex.test(job.company_name || '') ||
              regex.test(job.description || '') ||
              regex.test(job.requirements || '') ||
              regex.test(job.preferred_skills || '') ||
              regex.test(job.location || '') ||
              regex.test(job.job_type || '') ||
              regex.test(job.industry_category || '') ||
              regex.test(job.employment_type || '') ||
              regex.test(job.original_md_content || '')  // 元のMarkdown内容も検索対象
            )

            if (!match) {
              console.log(`❌ キーワード「${keyword}」がヒットしない: ${job.title} (${job.company_name})`)
            }

            return match
          })

          if (!keywordMatch) return false

          // 2. 年収フィルタ（キーワード検索時のみクライアント側で適用）
          if (filters.salaryMin > 300 || filters.salaryMax < 2000) {
            const salaryMin = job.salary_min || 0
            const salaryMax = job.salary_max || 9999

            // 求人の年収範囲とフィルタの年収範囲が重複するか確認
            const salaryMatch = salaryMin <= filters.salaryMax && salaryMax >= filters.salaryMin

            if (!salaryMatch) {
              console.log(`💰 年収フィルタで除外: ${job.title} (${salaryMin}-${salaryMax}万円)`)
              return false
            }
          }

          // 3. 勤務地フィルタ（キーワード検索時のみクライアント側で適用）
          if (filters.locations.length > 0) {
            const locationMatch = filters.locations.some(loc =>
              (job.location || '').toLowerCase().includes(loc.toLowerCase())
            )

            if (!locationMatch) {
              console.log(`📍 勤務地フィルタで除外: ${job.title} (${job.location})`)
              return false
            }
          }

          console.log(`✅ フィルタ通過: ${job.title} (${job.company_name})`)
          return true
        })

        console.log(`📊 フィルタリング結果: ${newJobs.length}件（元: ${beforeCount}件）`)

        // キーワード検索時はクライアント側でページネーション
        const totalFiltered = newJobs.length
        const startIdx = offset
        const endIdx = offset + ITEMS_PER_PAGE
        newJobs = newJobs.slice(startIdx, endIdx)
        console.log(`📄 クライアント側ページネーション: ${startIdx}〜${endIdx} (全${totalFiltered}件中${newJobs.length}件表示)`)

        setJobs(newJobs)
        setTotalCount(totalFiltered)
      } else {
        // キーワード検索なしの場合はDB側でページネーション済み
        const total = countResult?.count || 0
        setJobs(newJobs)
        setTotalCount(total)
      }
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