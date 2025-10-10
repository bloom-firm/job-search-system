import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { formatErrorMessage } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { companyName, jobTitle } = await request.json()

    // companyNameの検証（パストラバーサル対策）
    if (
      !companyName ||
      companyName.includes('..') ||
      companyName.includes('/') ||
      companyName.includes('\\')
    ) {
      return NextResponse.json(
        { error: '無効な企業名です' },
        { status: 400 }
      )
    }

    const pdfDir = path.join(process.cwd(), 'public', 'pdf', companyName)

    // 複数のパターンを試す
    const patterns = [
      jobTitle, // オリジナル
      jobTitle.replace(/\s*\/\s*/g, ' ・ '), // スラッシュ→中黒（スペースあり）
      jobTitle.replace(/\s*\/\s*/g, ' ・'), // スラッシュ→中黒（後スペースなし）
      jobTitle.replace(/\s*\/\s*/g, '・'), // スラッシュ→中黒（スペースなし）
      jobTitle.replace(/\s+/g, ' '), // スペース正規化
      jobTitle.replace(/　/g, ' '), // 全角→半角
    ]

    // ファイル一覧を取得
    const files = await fs.readdir(pdfDir)

    // パターンマッチング
    for (const pattern of patterns) {
      const filename = `${pattern}.pdf`
      if (files.includes(filename)) {
        return NextResponse.json({
          success: true,
          filename,
          path: `/pdf/${encodeURIComponent(companyName)}/${encodeURIComponent(pattern)}.pdf`
        })
      }
    }

    // 部分一致で探す（最終手段）
    const normalizedTitle = jobTitle.toLowerCase().replace(/\s+/g, '')
    const matchedFile = files.find(file => {
      const fileWithoutExt = file.replace('.pdf', '')
      const normalizedFile = fileWithoutExt.toLowerCase().replace(/\s+/g, '')
      return normalizedFile.includes(normalizedTitle) || normalizedTitle.includes(normalizedFile)
    })

    if (matchedFile) {
      const fileWithoutExt = matchedFile.replace('.pdf', '')
      return NextResponse.json({
        success: true,
        filename: matchedFile,
        path: `/pdf/${encodeURIComponent(companyName)}/${encodeURIComponent(fileWithoutExt)}.pdf`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'PDF not found'
    }, { status: 404 })

  } catch (error: unknown) {
    const errorMessage = formatErrorMessage(error)
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
