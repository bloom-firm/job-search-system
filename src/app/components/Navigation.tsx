'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Building, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isJobSearch = pathname === '/' || pathname?.startsWith('/jobs')
  const isCompanySearch = pathname?.startsWith('/company-search')

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左側：ナビゲーションタブ */}
          <div className="flex space-x-8">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                isJobSearch
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4" />
              求人検索
            </Link>
            <Link
              href="/company-search"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                isCompanySearch
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building className="w-4 h-4" />
              企業検索
            </Link>
          </div>

          {/* 右側：ログアウトボタン */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  )
}
