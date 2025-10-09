import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export default function CompanyNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          企業が見つかりません
        </h1>

        <p className="text-gray-600 mb-6">
          指定された企業は存在しないか、削除された可能性があります。
        </p>

        <Link
          href="/company-search"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          企業検索に戻る
        </Link>
      </div>
    </div>
  )
}
