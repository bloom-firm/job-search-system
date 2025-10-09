import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    if (params.path.length < 2) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    // Unicode正規化（NFD→NFC）: 濁点・半濁点を合成
    const companyName = params.path[0].normalize('NFC')
    const jobTitle = params.path[1].normalize('NFC')

    // PDFディレクトリのパス
    const pdfDir = path.join(process.cwd(), 'public', 'pdf', companyName)

    // セキュリティ: ディレクトリトラバーサル攻撃を防ぐ
    const normalizedDir = path.normalize(pdfDir)
    const publicPdfDir = path.join(process.cwd(), 'public', 'pdf')
    if (!normalizedDir.startsWith(publicPdfDir)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 複数のパターンでファイル名を生成
    const patterns: string[] = []

    // 基本パターン（スラッシュを中黒に変換）
    const slashToDot = [
      jobTitle, // オリジナル
      jobTitle.replace(/\s*\/\s*/g, ' ・ '), // スラッシュ→中黒（両側スペース）
      jobTitle.replace(/\s*\/\s*/g, '・ '), // スラッシュ→中黒（前なし後あり）
      jobTitle.replace(/\s*\/\s*/g, ' ・'), // スラッシュ→中黒（前あり後なし）
      jobTitle.replace(/\s*\/\s*/g, '・'), // スラッシュ→中黒（両側なし）
    ]

    // 各パターンに対してスペース正規化のバリエーションを追加
    for (const base of slashToDot) {
      patterns.push(base) // オリジナル
      patterns.push(base.replace(/　/g, ' ')) // 全角→半角
      patterns.push(base.replace(/　/g, ' ').replace(/\s+/g, ' ')) // スペース正規化
      patterns.push(base.replace(/　/g, ' ').replace(/\s+/g, ' ').trim()) // トリム

      // 【】の後にスペースを追加するパターン
      patterns.push(base.replace(/】/g, '】 '))
      patterns.push(base.replace(/】/g, '】 ').replace(/　/g, ' ').replace(/\s+/g, ' '))

      // 【】の前にスペースを追加するパターン
      patterns.push(base.replace(/【/g, ' 【'))
      patterns.push(base.replace(/【/g, ' 【').replace(/　/g, ' ').replace(/\s+/g, ' '))

      // 【】を削除してアンダースコアに変換するパターン（例: 【事業戦略部】経営企画 → 事業戦略部_経営企画）
      patterns.push(base.replace(/【([^】]+)】/g, '$1_'))
      patterns.push(base.replace(/【([^】]+)】/g, '$1_').replace(/　/g, ' ').replace(/\s+/g, ' '))

      // 【】を完全に削除するパターン
      patterns.push(base.replace(/【/g, '').replace(/】/g, ''))
      patterns.push(base.replace(/【/g, '').replace(/】/g, '').replace(/　/g, ' ').replace(/\s+/g, ' '))
    }

    // 重複を削除
    const normalizedPatterns = [...new Set(patterns)]

    // ディレクトリ内のファイル一覧を取得
    let files: string[] = []
    try {
      files = await fs.readdir(pdfDir)
    } catch {
      return new NextResponse('Company directory not found', { status: 404 })
    }

    // デバッグログ
    console.log('PDF Search Debug:', {
      company: companyName,
      jobTitle,
      patternsCount: normalizedPatterns.length,
      filesCount: files.length,
      firstPattern: normalizedPatterns[0],
      firstFile: files[0]
    })

    // 各パターンでファイルを検索
    for (const pattern of normalizedPatterns) {
      const filename = `${pattern}.pdf`
      if (files.includes(filename)) {
        console.log('✓ PDF Found:', filename)
        const filePath = path.join(pdfDir, filename)

        // ファイルパスの検証（シンボリックリンク対策）
        const resolvedFilePath = path.resolve(filePath)
        if (!resolvedFilePath.startsWith(publicPdfDir + path.sep)) {
          console.error('不正なファイルパス:', resolvedFilePath)
          continue
        }

        // シンボリックリンクを解決して再検証
        try {
          const realPath = await fs.realpath(filePath)
          if (!realPath.startsWith(publicPdfDir + path.sep)) {
            console.error('不正なシンボリックリンク:', realPath)
            continue
          }

          const fileBuffer = await fs.readFile(realPath)

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'inline',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (err) {
          console.error('ファイル読み込みエラー:', err)
          continue
        }
      }
    }

    // 部分一致で探す（最終手段）
    const normalizedTitle = jobTitle
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/　/g, '')
      .replace(/【/g, '')
      .replace(/】/g, '')
      .replace(/「/g, '')
      .replace(/」/g, '')
      .replace(/（/g, '')
      .replace(/）/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .normalize('NFC')

    const matchedFile = files.find(file => {
      if (!file.endsWith('.pdf')) return false
      const fileWithoutExt = file.replace('.pdf', '')
      const normalizedFile = fileWithoutExt
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/　/g, '')
        .replace(/【/g, '')
        .replace(/】/g, '')
        .replace(/「/g, '')
        .replace(/」/g, '')
        .replace(/（/g, '')
        .replace(/）/g, '')
        .replace(/\(/g, '')
        .replace(/\)/g, '')
        .normalize('NFC')

      // 長い方に短い方が含まれているかチェック
      const longer = normalizedFile.length > normalizedTitle.length ? normalizedFile : normalizedTitle
      const shorter = normalizedFile.length > normalizedTitle.length ? normalizedTitle : normalizedFile

      // 短い方が長い方の50%以上一致していればマッチとみなす
      if (shorter.length > 0 && longer.includes(shorter)) {
        return true
      }

      // 逆方向もチェック
      return normalizedFile.includes(normalizedTitle) || normalizedTitle.includes(normalizedFile)
    })

    if (matchedFile) {
      const filePath = path.join(pdfDir, matchedFile)

      // ファイルパスの検証（シンボリックリンク対策）
      const resolvedFilePath = path.resolve(filePath)
      if (!resolvedFilePath.startsWith(publicPdfDir + path.sep)) {
        console.error('不正なファイルパス:', resolvedFilePath)
        return new NextResponse('PDF not found', { status: 404 })
      }

      // シンボリックリンクを解決して再検証
      try {
        const realPath = await fs.realpath(filePath)
        if (!realPath.startsWith(publicPdfDir + path.sep)) {
          console.error('不正なシンボリックリンク:', realPath)
          return new NextResponse('PDF not found', { status: 404 })
        }

        const fileBuffer = await fs.readFile(realPath)

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      } catch (err) {
        console.error('ファイル読み込みエラー:', err)
        return new NextResponse('Error loading PDF', { status: 500 })
      }
    }

    // 見つからない場合、利用可能なファイル一覧を返す（デバッグ用）
    console.error('PDF not found:', {
      company: companyName,
      jobTitle,
      availableFiles: files.slice(0, 10)
    })

    return new NextResponse('PDF not found', { status: 404 })

  } catch (error: any) {
    console.error('PDF proxy error:', error)
    return new NextResponse('Error loading PDF', { status: 500 })
  }
}
