'use client'

import { useParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function PdfViewerPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string[]

  if (!slug || slug.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PDFが見つかりません</h1>
          <p className="text-gray-600">URLが正しくありません。</p>
        </div>
      </div>
    )
  }

  const companyName = decodeURIComponent(slug[0])
  const jobTitle = decodeURIComponent(slug[1])
  const pdfPath = `/pdf/${encodeURIComponent(companyName)}/${encodeURIComponent(jobTitle)}.pdf`

  const handleClose = () => {
    if (window.opener) {
      window.close()
    } else {
      router.back()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{jobTitle}</h1>
            <p className="text-gray-600 mt-1">{companyName}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            閉じる
          </button>
        </div>

        {/* PDF表示 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <iframe
            src={pdfPath}
            width="100%"
            height="800px"
            className="border-0"
            title={`${companyName} - ${jobTitle}`}
          />
        </div>
      </div>
    </div>
  )
}
