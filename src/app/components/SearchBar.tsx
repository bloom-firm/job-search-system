'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin } from 'lucide-react'
import LocationModal from './LocationModal'

export interface SearchFilters {
  keyword: string
  salaryMin: number
  salaryMax: number
  locations: string[]
  jobType: string
  industry: string
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = "キーワードで検索（職種、企業名、スキルなど）" }: SearchBarProps) {
  const [keyword, setKeyword] = useState('')
  const [salaryMin, setSalaryMin] = useState(300)
  const [salaryMax, setSalaryMax] = useState(2000)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [jobType, setJobType] = useState('')
  const [industry, setIndustry] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // キーワード以外のフィルタ変更時にリアルタイム検索
  useEffect(() => {
    onSearch({
      keyword,
      salaryMin,
      salaryMax,
      locations: selectedLocations,
      jobType,
      industry
    })
  }, [salaryMin, salaryMax, selectedLocations, jobType, industry])

  const handleLocationApply = (locations: string[]) => {
    setSelectedLocations(locations)
    setIsLocationModalOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({
      keyword,
      salaryMin,
      salaryMax,
      locations: selectedLocations,
      jobType,
      industry
    })
  }

  return (
    <div className="w-full space-y-4">
      {/* キーワード検索 */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={placeholder}
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
      </form>

      {/* フィルタセクション */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-6">
        {/* 年収範囲 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            年収範囲
          </label>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="300"
                  max="2000"
                  step="50"
                  value={salaryMin}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (value <= salaryMax) {
                      setSalaryMin(value)
                    }
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min="300"
                  max="2000"
                  step="50"
                  value={salaryMax}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (value >= salaryMin) {
                      setSalaryMax(value)
                    }
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
            <div className="text-center text-gray-700 font-medium">
              {salaryMin}万円 〜 {salaryMax}万円
            </div>
          </div>
        </div>

        {/* 勤務地 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            勤務地
          </label>
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <MapPin className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">
              {selectedLocations.length > 0
                ? `${selectedLocations.slice(0, 3).join('、')}${selectedLocations.length > 3 ? ` 他${selectedLocations.length - 3}件` : ''}`
                : '勤務地を選択'}
            </span>
          </button>
        </div>

        {/* 職種 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            職種
          </label>
          <input
            type="text"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            placeholder="例: エンジニア、営業、デザイナー"
            className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 業界 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            業界
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="業界を入力（例：IT、金融、製造業）"
            className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 勤務地選択モーダル */}
      <LocationModal
        isOpen={isLocationModalOpen}
        selectedLocations={selectedLocations}
        onClose={() => setIsLocationModalOpen(false)}
        onApply={handleLocationApply}
      />
    </div>
  )
}