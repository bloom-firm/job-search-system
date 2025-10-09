'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, MapPin, Users, Calendar, TrendingUp, ArrowLeft, AlertTriangle, Eye, EyeOff, Briefcase, FileText, DollarSign, Globe, Target, Lightbulb, Package, Handshake, BarChart3 } from 'lucide-react'

interface CompanyData {
  id: number
  company_name: string
  basic_info?: {
    official_name?: string
    founded?: string
    headquarters?: string
    employees?: string
    listing_status?: string
    business_description?: string
    location?: string
    vision?: string
    products?: string
    business_model?: string
    clients?: string
    competitors?: string
  }
  work_style?: {
    work_format?: string
    annual_holidays?: string
    benefits?: string
  }
  selection_process?: {
    flow?: string
    speed?: string
    key_points?: string
  }
  recruitment_reality?: {
    education_requirements?: string
    job_change_limit?: string
    age_preference?: string
    other_criteria?: string[]
    characteristics?: string[]
  }
  internal_memo?: {
    company_characteristics?: string[]
    selection_notes?: string[]
    proposal_tips?: string[]
    other_notes?: string[]
  }
  contract_info?: {
    commission_rate?: string
    refund_policy?: any
    contract_period?: string
    special_terms?: string
    contract_status?: string
    email?: string
    url?: string
  }
  created_at: string
  updated_at: string
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfidential, setShowConfidential] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchCompany()
  }, [id])

  const fetchCompany = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('companies_master')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        router.push('/company-search')
        return
      }

      setCompany(data as CompanyData)

      // 不足情報をチェックして自動取得
      const basicInfo = data.basic_info || {}
      const needsEnrichment =
        !basicInfo.vision ||
        !basicInfo.products ||
        !basicInfo.business_model ||
        !basicInfo.clients ||
        !basicInfo.competitors

      if (needsEnrichment) {
        console.log('🔄 Auto-enriching company info...')
        enrichCompanyInfo(data.id, data.company_name, basicInfo.official_name)
      }
    } catch (err) {
      console.error('Error fetching company:', err)
      router.push('/company-search')
    } finally {
      setLoading(false)
    }
  }

  const enrichCompanyInfo = async (companyId: number, companyName: string, officialName?: string) => {
    try {
      const response = await fetch('/api/enrich-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          companyName,
          officialName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to enrich company info')
      }

      const result = await response.json()

      if (result.success && result.data) {
        // UIを更新
        setCompany(prev => prev ? {
          ...prev,
          basic_info: result.data
        } : null)
        console.log('✅ Company info enriched successfully')
      }
    } catch (error) {
      console.error('Error enriching company info:', error)
      // エラーは silent に処理（ユーザーには影響しない）
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/company-search"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            企業検索に戻る
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 企業名セクション */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-lg p-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {company.company_name}
              </h1>
              {company.basic_info?.official_name && company.basic_info.official_name !== company.company_name && (
                <p className="text-lg text-gray-600">
                  {company.basic_info.official_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 公開情報セクション（緑色の背景） */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="w-6 h-6 text-green-700" />
            <h2 className="text-2xl font-bold text-green-900">公開情報</h2>
          </div>

          {/* ① 会社の基本情報 */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              会社の基本情報
            </h3>

            <div className="space-y-4">
              {company.contract_info?.url && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">企業URL</p>
                    <a
                      href={company.contract_info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 hover:text-blue-700 mt-1 inline-block"
                    >
                      {company.contract_info.url}
                    </a>
                  </div>
                </div>
              )}

              {company.basic_info?.founded && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">設立年</p>
                    <p className="text-base text-gray-900 mt-1">{company.basic_info.founded}</p>
                  </div>
                </div>
              )}

              {company.basic_info?.headquarters && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">本社所在地</p>
                    <p className="text-base text-gray-900 mt-1">{company.basic_info.headquarters}</p>
                  </div>
                </div>
              )}

              {company.basic_info?.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">その他拠点</p>
                    <p className="text-base text-gray-900 mt-1">{company.basic_info.location}</p>
                  </div>
                </div>
              )}

              {company.basic_info?.employees && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">従業員数</p>
                    <p className="text-base text-gray-900 mt-1">{company.basic_info.employees}</p>
                  </div>
                </div>
              )}

              {company.basic_info?.listing_status && (
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">上場区分</p>
                    <p className="text-base text-gray-900 mt-1">{company.basic_info.listing_status}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ② 事業・理念 */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              事業・理念
            </h3>

            <div className="space-y-4">
              {company.basic_info?.business_description ? (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">事業内容</p>
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap leading-relaxed">
                      {company.basic_info.business_description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">事業内容</p>
                    <p className="text-base text-gray-400 mt-1">情報なし</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">ビジョン・ミッション</p>
                  {company.basic_info?.vision ? (
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.basic_info.vision}</p>
                  ) : (
                    <p className="text-base text-gray-400 mt-1">情報取得中...</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">プロダクト/サービス</p>
                  {company.basic_info?.products ? (
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.basic_info.products}</p>
                  ) : (
                    <p className="text-base text-gray-400 mt-1">情報取得中...</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">ビジネスモデル</p>
                  {company.basic_info?.business_model ? (
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.basic_info.business_model}</p>
                  ) : (
                    <p className="text-base text-gray-400 mt-1">情報取得中...</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Handshake className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">主要クライアント</p>
                  {company.basic_info?.clients ? (
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.basic_info.clients}</p>
                  ) : (
                    <p className="text-base text-gray-400 mt-1">情報取得中...</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">競合企業</p>
                  {company.basic_info?.competitors ? (
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.basic_info.competitors}</p>
                  ) : (
                    <p className="text-base text-gray-400 mt-1">情報取得中...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ③ 働き方・制度 */}
          {company.work_style && (
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                働き方・制度
              </h3>

              <div className="space-y-4">
                {company.work_style.work_format && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">勤務形態</p>
                    <p className="text-base text-gray-900 mt-1">{company.work_style.work_format}</p>
                  </div>
                )}

                {company.work_style.annual_holidays && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">年間休日数</p>
                    <p className="text-base text-gray-900 mt-1">{company.work_style.annual_holidays}</p>
                  </div>
                )}

                {company.work_style.benefits && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">福利厚生</p>
                    <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.work_style.benefits}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 社内限定情報セクション（赤色の背景） */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-700" />
              <h2 className="text-2xl font-bold text-red-900">社内限定情報</h2>
            </div>
            <button
              onClick={() => setShowConfidential(!showConfidential)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {showConfidential ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  非表示にする
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  表示する
                </>
              )}
            </button>
          </div>

          {showConfidential && (
            <div className="space-y-6">
              {/* 選考プロセス */}
              {company.selection_process && (
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    選考プロセス
                  </h3>

                  <div className="space-y-4">
                    {company.selection_process.flow && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">選考フロー</p>
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.selection_process.flow}</p>
                      </div>
                    )}

                    {company.selection_process.speed && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">選考スピード</p>
                        <p className="text-base text-gray-900 mt-1">{company.selection_process.speed}</p>
                      </div>
                    )}

                    {company.selection_process.key_points && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">選考のポイント</p>
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.selection_process.key_points}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 契約情報 */}
              {company.contract_info && (
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-red-600" />
                    契約情報
                  </h3>

                  <div className="space-y-4">
                    {company.contract_info.contract_status && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">契約状況</p>
                        <p className="text-base text-gray-900 mt-1">{company.contract_info.contract_status}</p>
                      </div>
                    )}

                    {company.contract_info.commission_rate && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">紹介手数料率</p>
                        <p className="text-base text-gray-900 mt-1">{company.contract_info.commission_rate}</p>
                      </div>
                    )}

                    {company.contract_info.contract_period && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">契約期間</p>
                        <p className="text-base text-gray-900 mt-1">{company.contract_info.contract_period}</p>
                      </div>
                    )}

                    {company.contract_info.refund_policy && Object.keys(company.contract_info.refund_policy).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">返金ポリシー</p>
                        <div className="space-y-1">
                          {Object.entries(company.contract_info.refund_policy).map(([period, rate]) => (
                            <p key={period} className="text-base text-gray-900">
                              {period}: {rate as string}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {company.contract_info.special_terms && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">特記事項</p>
                        <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{company.contract_info.special_terms}</p>
                      </div>
                    )}

                    {company.contract_info.email && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">担当者メール</p>
                        <p className="text-base text-gray-900 mt-1">{company.contract_info.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 採用実態 */}
              {company.recruitment_reality && (
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-600" />
                    採用実態
                  </h3>

                  <div className="space-y-4">
                    {company.recruitment_reality.education_requirements && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">学歴要件</p>
                        <p className="text-base text-gray-900 mt-1">{company.recruitment_reality.education_requirements}</p>
                      </div>
                    )}

                    {company.recruitment_reality.job_change_limit && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">転職回数制限</p>
                        <p className="text-base text-gray-900 mt-1">{company.recruitment_reality.job_change_limit}</p>
                      </div>
                    )}

                    {company.recruitment_reality.age_preference && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">年齢</p>
                        <p className="text-base text-gray-900 mt-1">{company.recruitment_reality.age_preference}</p>
                      </div>
                    )}

                    {company.recruitment_reality.other_criteria && company.recruitment_reality.other_criteria.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">その他要件</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.recruitment_reality.other_criteria.map((criteria, idx) => (
                            <li key={idx} className="text-base text-gray-900">{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {company.recruitment_reality.characteristics && company.recruitment_reality.characteristics.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">特徴</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.recruitment_reality.characteristics.map((char, idx) => (
                            <li key={idx} className="text-base text-gray-900">{char}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 社内メモ */}
              {company.internal_memo && (
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    社内メモ
                  </h3>

                  <div className="space-y-6">
                    {company.internal_memo.company_characteristics && company.internal_memo.company_characteristics.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">企業特性</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.internal_memo.company_characteristics.map((item, idx) => (
                            <li key={idx} className="text-base text-gray-900">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {company.internal_memo.selection_notes && company.internal_memo.selection_notes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">選考メモ</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.internal_memo.selection_notes.map((item, idx) => (
                            <li key={idx} className="text-base text-gray-900">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {company.internal_memo.proposal_tips && company.internal_memo.proposal_tips.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">提案のコツ</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.internal_memo.proposal_tips.map((item, idx) => (
                            <li key={idx} className="text-base text-gray-900">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {company.internal_memo.other_notes && company.internal_memo.other_notes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">その他メモ</p>
                        <ul className="list-disc list-inside space-y-1">
                          {company.internal_memo.other_notes.map((item, idx) => (
                            <li key={idx} className="text-base text-gray-900">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!showConfidential && (
            <p className="text-red-700 text-center py-4">
              「表示する」ボタンをクリックして社内限定情報を表示してください
            </p>
          )}
        </div>

        {/* 関連求人セクション */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">この企業の求人</h2>
          <p className="text-gray-600 mb-6">この企業に関連する求人情報を表示します</p>
          <Link
            href={`/company-search/${encodeURIComponent(company.company_name)}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            求人を検索
          </Link>
        </div>
      </main>
    </div>
  )
}
