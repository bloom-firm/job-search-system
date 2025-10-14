import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatErrorMessage } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [find-pdf] API called')

    // デバッグ：Cookie情報を確認
    const allCookies = request.cookies.getAll()
    console.log('🍪 [find-pdf] All cookies:', allCookies.map(c => c.name))

    // Supabase関連のCookieを探す
    const supabaseCookies = allCookies.filter(c => c.name.includes('sb-'))
    console.log('🔑 [find-pdf] Supabase cookies found:', supabaseCookies.length)
    supabaseCookies.forEach(c => {
      console.log(`   - ${c.name}: ${c.value.substring(0, 20)}...`)
    })

    // 認証チェック
    const supabase = await createClient()

    // まずセッションを確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('🔐 [find-pdf] Session exists:', !!session)
    console.log('🔐 [find-pdf] Session error:', sessionError?.message || 'none')

    // ユーザー情報を取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('👤 [find-pdf] User:', user?.id || 'none')
    console.log('❌ [find-pdf] Auth error:', authError?.message || 'none')
    console.log('📧 [find-pdf] User email:', user?.email || 'none')

    if (authError || !user) {
      console.error('❌ [find-pdf] Authentication failed - Full error:', authError)
      console.error('❌ [find-pdf] Session data:', session)
      return NextResponse.json(
        {
          error: '認証が必要です',
          debug: {
            hasSession: !!session,
            sessionError: sessionError?.message,
            authError: authError?.message,
          }
        },
        { status: 401 }
      )
    }

    const { jobId } = await request.json()
    console.log('🔢 [find-pdf] Job ID:', jobId)

    // 入力検証
    if (!jobId) {
      return NextResponse.json(
        { error: 'job_idが必要です' },
        { status: 400 }
      )
    }

    // データベースからjob_idで検索
    console.log('🔎 [find-pdf] Searching pdf_mappings for job_id:', jobId)
    const { data: mapping, error: dbError } = await supabase
      .from('pdf_mappings')
      .select('*')
      .eq('job_id', jobId)
      .single()

    console.log('📄 [find-pdf] Mapping result:', mapping ? `Found: ${mapping.pdf_filename}` : 'Not found')
    if (dbError) console.error('❌ [find-pdf] DB Error:', dbError)

    if (dbError || !mapping) {
      return NextResponse.json({
        success: false,
        error: 'PDF not found',
        details: dbError?.message
      }, { status: 404 })
    }

    // Supabase Storageから署名付きURLを取得
    console.log('🔐 [find-pdf] Creating signed URL for:', mapping.pdf_filename)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('job-pdfs')
      .createSignedUrl(mapping.pdf_filename, 3600)

    if (urlError) {
      console.error('❌ [find-pdf] Storage URL error:', urlError)
    } else {
      console.log('✅ [find-pdf] Signed URL created:', signedUrlData?.signedUrl?.substring(0, 100) + '...')
    }

    if (urlError || !signedUrlData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate PDF URL',
        details: urlError?.message || 'Unknown error'
      }, { status: 500 })
    }

    console.log('✅ [find-pdf] Success!')
    return NextResponse.json({
      success: true,
      filename: mapping.pdf_filename,
      originalPath: mapping.original_path,
      url: signedUrlData.signedUrl
    })

  } catch (error: unknown) {
    console.error('💥 [find-pdf] Fatal error:', error)
    const errorMessage = formatErrorMessage(error)
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
