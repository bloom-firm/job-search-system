'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Building, Users, Briefcase, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Company {
  name: string
  industry: string
  size: string
  jobCount: number
}

export default function CompanySearchPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    filterCompanies()
  }, [searchKeyword, industryFilter, companies])

  const fetchCompanies = async () => {
    try {
      const supabase = createClient()

      // 全データ取得のため、複数回に分けて取得
      let allJobs: any[] = []
      let rangeStart = 0
      const rangeSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('jobs')
          .select('company_name, industry_category, company_size')
          .order('company_name')
          .range(rangeStart, rangeStart + rangeSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break

        allJobs = [...allJobs, ...data]
        rangeStart += rangeSize

        if (data.length < rangeSize) break
      }

      console.log('全取得件数:', allJobs.length)

      // 企業名でグループ化
      const companyMap = new Map<string, Company>()
      let skippedCount = 0

      allJobs.forEach(job => {
        if (!job.company_name || job.company_name.trim() === '') {
          skippedCount++
          return
        }

        if (!companyMap.has(job.company_name)) {
          companyMap.set(job.company_name, {
            name: job.company_name,
            industry: job.industry_category,
            size: job.company_size,
            jobCount: 1
          })
        } else {
          const company = companyMap.get(job.company_name)!
          company.jobCount++
        }
      })

      console.log('スキップされた件数:', skippedCount)
      console.log('companyMap size:', companyMap.size)

      const companiesArray = Array.from(companyMap.values())
      console.log('ユニークな企業数:', companiesArray.length)
      console.log('企業リスト:', companiesArray.map(c => c.name))

      setCompanies(companiesArray)
      setFilteredCompanies(companiesArray)
    } catch (err: any) {
      console.error('Error fetching companies:', err)
      setError(err.message || '企業情報の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    // 企業名検索
    if (searchKeyword) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    }

    // 業界フィルタ
    if (industryFilter) {
      filtered = filtered.filter(company =>
        company.industry.toLowerCase().includes(industryFilter.toLowerCase())
      )
    }

    setFilteredCompanies(filtered)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    filterCompanies()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">企業検索</h1>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              求人検索へ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* 企業名検索 */}
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="企業名で検索"
                className="w-full px-4 py-3 pl-12 pr-24 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                検索
              </button>
            </div>

            {/* 業界フィルタ */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                業界
              </label>
              <input
                type="text"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                placeholder="業界を入力（例：IT、金融、製造業）"
                className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>
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

        {/* 企業一覧 */}
        {!loading && !error && (
          <>
            <div className="mb-6">
              <p className="text-gray-700">
                <span className="font-semibold">{filteredCompanies.length.toLocaleString()}社</span>
                の企業が見つかりました
              </p>
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  該当する企業が見つかりませんでした。
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.name}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {company.name}
                      </h3>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-gray-600 text-sm">
                        <Building className="w-4 h-4 mr-2 text-gray-500" />
                        <span>{company.industry}</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Users className="w-4 h-4 mr-2 text-gray-500" />
                        <span>{company.size}</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Briefcase className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-medium text-blue-600">
                          {company.jobCount}件の求人
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <Link
                        href={`/company-search/${encodeURIComponent(company.name)}`}
                        className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        この企業の求人を見る
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
