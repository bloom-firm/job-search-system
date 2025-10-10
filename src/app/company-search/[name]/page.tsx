'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'
import JobCard from '@/app/components/JobCard'
import { ArrowLeft, Loader2, Building } from 'lucide-react'
import { formatErrorMessage } from '@/lib/utils/errors'

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const companyName = decodeURIComponent(params.name as string)

  const fetchCompanyJobs = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_name', companyName)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error: unknown) {
      console.error('Error fetching company jobs:', error)
      const errorMessage = formatErrorMessage(error, '求人情報の取得に失敗しました。')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [companyName])

  useEffect(() => {
    fetchCompanyJobs()
  }, [fetchCompanyJobs])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              戻る
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 企業名 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
          </div>
          {!loading && !error && (
            <p className="text-gray-600 ml-11">
              {jobs.length}件の求人
            </p>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 求人一覧 */}
        {!loading && !error && (
          <>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  この企業の求人が見つかりませんでした。
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
