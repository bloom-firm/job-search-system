import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { formatErrorMessage } from '@/lib/utils/errors'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

const isDevelopment = process.env.NODE_ENV === 'development'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック（OpenAI APIコスト対策: 5リクエスト/分）
    const identifier = getRateLimitIdentifier(request)
    const rateLimit = checkRateLimit(identifier, {
      limit: 5,
      windowSeconds: 60
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'レート制限を超過しました。しばらくしてから再度お試しください。' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          }
        }
      )
    }

    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { companyId, companyName, officialName } = await request.json()

    if (!companyId || !companyName) {
      return NextResponse.json(
        { error: 'Company ID and name are required' },
        { status: 400 }
      )
    }

    if (isDevelopment) {
      console.log(`🔍 Enriching company info for: ${companyName}`)
    }

    // OpenAI APIで企業情報を取得
    const searchName = officialName || companyName
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは企業情報を調査するアシスタントです。与えられた企業名について、最新の公開情報を基に以下の項目を調査し、JSON形式で回答してください。情報が見つからない場合は空文字列を返してください。

回答フォーマット:
{
  "vision": "企業のビジョン・ミッション",
  "products": "主要なプロダクト/サービス（3つ程度、箇条書き）",
  "business_model": "ビジネスモデルの説明",
  "clients": "主要クライアント（3-5社程度）",
  "competitors": "競合企業（3-5社程度）"
}`
        },
        {
          role: 'user',
          content: `企業名: ${searchName}\n\n上記の企業について調査してください。`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const responseText = completion.choices[0].message.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    const enrichedData = JSON.parse(responseText)

    if (isDevelopment) {
      console.log('📊 Enriched data:', enrichedData)
    }

    // 既存のbasic_infoを取得
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies_master')
      .select('basic_info')
      .eq('id', companyId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // basic_infoを更新（既存のデータに追加）
    const updatedBasicInfo = {
      ...(existingCompany?.basic_info || {}),
      vision: enrichedData.vision || '',
      products: enrichedData.products || '',
      business_model: enrichedData.business_model || '',
      clients: enrichedData.clients || '',
      competitors: enrichedData.competitors || ''
    }

    // DBに保存
    const { error: updateError } = await supabaseAdmin
      .from('companies_master')
      .update({ basic_info: updatedBasicInfo })
      .eq('id', companyId)

    if (updateError) {
      throw updateError
    }

    if (isDevelopment) {
      console.log('✅ Company info enriched successfully')
    }

    return NextResponse.json({
      success: true,
      data: updatedBasicInfo
    })
  } catch (error: unknown) {
    if (isDevelopment) {
      console.error('Error enriching company info:', error)
    }
    const errorMessage = formatErrorMessage(error, 'Failed to enrich company info')
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
