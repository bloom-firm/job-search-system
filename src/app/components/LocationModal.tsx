'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface LocationModalProps {
  isOpen: boolean
  selectedLocations: string[]
  onClose: () => void
  onApply: (locations: string[]) => void
}

const REGIONS = {
  '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  '関西': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  '中国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  '四国': ['徳島県', '香川県', '愛媛県', '高知県'],
  '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
}

export default function LocationModal({ isOpen, selectedLocations, onClose, onApply }: LocationModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setTempSelected([...selectedLocations])
    }
  }, [isOpen, selectedLocations])

  if (!isOpen) return null

  const handleToggle = (location: string) => {
    setTempSelected(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    )
  }

  const handleRegionToggle = (region: string) => {
    const regionLocations = REGIONS[region as keyof typeof REGIONS]
    const allSelected = regionLocations.every(loc => tempSelected.includes(loc))

    if (allSelected) {
      setTempSelected(prev => prev.filter(loc => !regionLocations.includes(loc)))
    } else {
      setTempSelected(prev => {
        const filtered = prev.filter(loc => !regionLocations.includes(loc))
        return [...filtered, ...regionLocations]
      })
    }
  }

  const handleApply = () => {
    onApply(tempSelected)
  }

  const handleCancel = () => {
    setTempSelected([])
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">勤務地を選択</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Object.entries(REGIONS).map(([region, locations]) => {
              const allSelected = locations.every(loc => tempSelected.includes(loc))
              const someSelected = locations.some(loc => tempSelected.includes(loc))

              return (
                <div key={region} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id={`region-${region}`}
                      checked={allSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = someSelected && !allSelected
                        }
                      }}
                      onChange={() => handleRegionToggle(region)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor={`region-${region}`}
                      className="ml-2 text-lg font-semibold text-gray-900 cursor-pointer"
                    >
                      {region}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ml-6">
                    {locations.map(location => (
                      <label
                        key={location}
                        className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={tempSelected.includes(location)}
                          onChange={() => handleToggle(location)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="ml-2 text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {tempSelected.length > 0 && `${tempSelected.length}件選択中`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
