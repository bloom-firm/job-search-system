'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'
import { ArrowLeft, MapPin, Briefcase, DollarSign, Building, Users, FileText, Loader2 } from 'lucide-react'
import { formatErrorMessage } from '@/lib/utils/errors'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const jobId = params.id as string

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (error) throw error
        setJob(data)
      } catch (error: unknown) {
        console.error('Error fetching job:', error)
        const errorMessage = formatErrorMessage(error, '求人情報の取得に失敗しました。')
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
    if (!min && !max) return '給与非公開'
    if (!min) return `〜${max?.toLocaleString()}万円`
    if (!max) return `${min.toLocaleString()}万円〜`
    return `${min.toLocaleString()}万円 - ${max.toLocaleString()}万円`
  }

  const generatePdfViewerPath = (companyName: string, jobTitle: string) => {
    return `/pdf/${encodeURIComponent(companyName)}/${encodeURIComponent(jobTitle)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600 mb-4">{error || '求人が見つかりませんでした。'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  const pdfViewerUrl = generatePdfViewerPath(job.company_name, job.title)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6 flex justify-between items-start">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            戻る
          </button>
          <a
            href={pdfViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF表示
          </a>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* 基本情報 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
            <p className="text-2xl text-blue-600 font-medium mb-6">{job.company_name}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Briefcase className="w-5 h-5 mr-2 text-gray-500" />
                <span>{job.employment_type}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <DollarSign className="w-5 h-5 mr-2 text-gray-500" />
                <span>{formatSalary(job.salary_min, job.salary_max)}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Building className="w-5 h-5 mr-2 text-gray-500" />
                <span>{job.industry_category}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                <span>{job.company_size}</span>
              </div>
              <div className="flex items-center">
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">
                  {job.job_type}
                </span>
              </div>
            </div>
          </div>

          {/* 仕事内容 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              仕事内容
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* 必須要件 */}
          {job.requirements && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                必須要件
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.requirements}
              </p>
            </div>
          )}

          {/* 歓迎要件 */}
          {job.preferred_skills && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                歓迎要件
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.preferred_skills}
              </p>
            </div>
          )}

          {/* 福利厚生 */}
          {job.benefits && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                福利厚生
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.benefits}
              </p>
            </div>
          )}

          {/* 選考プロセス */}
          {job.selection_process && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                選考プロセス
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.selection_process}
              </p>
            </div>
          )}

          {/* その他情報 */}
          <div className="pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <p>掲載日: {new Date(job.created_at).toLocaleDateString('ja-JP')}</p>
              {job.updated_at && job.updated_at !== job.created_at && (
                <p>更新日: {new Date(job.updated_at).toLocaleDateString('ja-JP')}</p>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            戻る
          </button>
          <a
            href={pdfViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF表示
          </a>
        </div>
      </div>
    </div>
  )
}
