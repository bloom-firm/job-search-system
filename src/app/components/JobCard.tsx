'use client'

import { MapPin, Briefcase, DollarSign, Calendar, Users, Building, FileText } from 'lucide-react'
import { Job } from '@/lib/types/job'
import Link from 'next/link'
import { useState } from 'react'

interface JobCardProps {
  job: Job
}

export default function JobCard({ job }: JobCardProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
    if (!min && !max) return '給与非公開'
    if (!min) return `〜${max?.toLocaleString()}万円`
    if (!max) return `${min.toLocaleString()}万円〜`
    return `${min.toLocaleString()}万円 - ${max.toLocaleString()}万円`
  }

  const handlePdfClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      return
    }

    setPdfLoading(true)
    try {
      const response = await fetch('/api/find-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ jobId: job.id }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        setPdfUrl(data.url)
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        alert('PDFが見つかりませんでした')
      }
    } catch (error) {
      console.error('Error fetching PDF URL:', error)
      alert('PDFの取得に失敗しました')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 relative">
      {/* PDF表示ボタン - 右上に配置 */}
      <button
        onClick={handlePdfClick}
        disabled={pdfLoading}
        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="PDF詳細を表示"
      >
        <FileText className="w-5 h-5" />
      </button>

      <div className="mb-4 pr-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {job.title}
        </h3>
        {job.company_id ? (
          <Link
            href={`/companies/${job.company_id}`}
            className="text-lg text-blue-600 font-medium hover:text-blue-700 hover:underline cursor-pointer inline-block"
          >
            {job.company_name}
          </Link>
        ) : (
          <p className="text-lg text-blue-600 font-medium">{job.company_name}</p>
        )}
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3 text-sm">{job.description}</p>

      <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="truncate max-w-[200px]">{job.location}</span>
        </div>
        <div className="flex items-center">
          <Briefcase className="w-4 h-4 mr-1" />
          <span>{job.employment_type}</span>
        </div>
        {(job.salary_min || job.salary_max) && (
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            <span>{formatSalary(job.salary_min, job.salary_max)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-1 text-gray-500" />
          <span className="text-xs text-gray-600">{job.industry_category}</span>
        </div>
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1 text-gray-500" />
          <span className="text-xs text-gray-600">{job.company_size}</span>
        </div>
        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md">
          {job.job_type}
        </span>
      </div>

      {/* 必須要件・歓迎要件を非表示 */}
      {/* {job.requirements && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">必須要件</h4>
          <p className="text-xs text-gray-600 line-clamp-2">{job.requirements}</p>
        </div>
      )}

      {job.preferred_skills && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">歓迎要件</h4>
          <p className="text-xs text-gray-600 line-clamp-2">{job.preferred_skills}</p>
        </div>
      )} */}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500 flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(job.created_at).toLocaleDateString('ja-JP')}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handlePdfClick}
            disabled={pdfLoading}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">{pdfLoading ? '読込中...' : 'PDF表示'}</span>
          </button>
          <a
            href={`/jobs/${job.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium inline-block"
          >
            詳細を見る
          </a>
        </div>
      </div>
    </div>
  )
}