import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

interface PDFCheckResult {
  id: string
  title: string
  company_name: string
  expectedPath: string
  actualFiles?: string[]
}

async function checkAllPDFs() {
  console.log('🔍 全求人のPDF存在確認を開始します...\n')

  // 全求人を取得
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, company_name')

  if (error || !jobs) {
    console.error('❌ 求人取得エラー:', error)
    return
  }

  console.log(`📊 総求人数: ${jobs.length}\n`)

  const results = {
    found: [] as PDFCheckResult[],
    notFound: [] as PDFCheckResult[],
    totalChecked: 0
  }

  for (const job of jobs) {
    results.totalChecked++

    const companyDir = path.join(
      process.cwd(),
      'public',
      'pdf',
      job.company_name
    )

    // 会社ディレクトリが存在するか確認
    if (!fs.existsSync(companyDir)) {
      results.notFound.push({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        expectedPath: `${companyDir}/${job.title}.pdf`,
        actualFiles: []
      })
      continue
    }

    // ディレクトリ内のPDFファイル一覧を取得
    const files = fs.readdirSync(companyDir).filter(f => f.endsWith('.pdf'))

    // 完全一致で探す
    const exactMatch = `${job.title}.pdf`
    if (files.includes(exactMatch)) {
      results.found.push({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        expectedPath: path.join(companyDir, exactMatch)
      })
    } else {
      // 部分一致で探す
      const normalizedTitle = job.title.toLowerCase().replace(/\s+/g, '')
      const partialMatch = files.find(file => {
        const normalizedFile = file.replace('.pdf', '').toLowerCase().replace(/\s+/g, '')
        return normalizedFile.includes(normalizedTitle) || normalizedTitle.includes(normalizedFile)
      })

      results.notFound.push({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        expectedPath: path.join(companyDir, exactMatch),
        actualFiles: partialMatch ? [partialMatch] : files.slice(0, 3) // 最初の3ファイルを参考として記録
      })
    }

    // 進捗表示（100件ごと）
    if (results.totalChecked % 100 === 0) {
      process.stdout.write(`\r進捗: ${results.totalChecked}/${jobs.length} (${Math.round(results.totalChecked / jobs.length * 100)}%)`)
    }
  }

  console.log('\n\n=== 結果サマリー ===')
  console.log(`✅ PDF存在: ${results.found.length}件 (${Math.round(results.found.length / jobs.length * 100)}%)`)
  console.log(`❌ PDF不在: ${results.notFound.length}件 (${Math.round(results.notFound.length / jobs.length * 100)}%)`)

  // 不在のPDFをファイルに出力
  if (results.notFound.length > 0) {
    fs.writeFileSync(
      'pdf-not-found.json',
      JSON.stringify(results.notFound, null, 2),
      'utf8'
    )
    console.log('\n📝 不在PDFの詳細を pdf-not-found.json に出力しました')

    // パターン分析
    analyzePatterns(results.notFound)
  }

  return results
}

function analyzePatterns(notFoundList: PDFCheckResult[]) {
  console.log('\n=== パターン分析 ===\n')

  // 特殊文字を含むタイトルを抽出
  const specialChars = /[&()（）【】「」＆]/
  const withSpecialChars = notFoundList.filter(job =>
    specialChars.test(job.title)
  )
  console.log(`📌 特殊文字を含むタイトル: ${withSpecialChars.length}件 (${Math.round(withSpecialChars.length / notFoundList.length * 100)}%)`)

  // スペースを含むタイトル
  const withSpaces = notFoundList.filter(job =>
    job.title.includes(' ') || job.title.includes('　')
  )
  console.log(`📌 スペースを含むタイトル: ${withSpaces.length}件 (${Math.round(withSpaces.length / notFoundList.length * 100)}%)`)

  // スラッシュを含むタイトル
  const withSlashes = notFoundList.filter(job =>
    job.title.includes('/')
  )
  console.log(`📌 スラッシュを含むタイトル: ${withSlashes.length}件 (${Math.round(withSlashes.length / notFoundList.length * 100)}%)`)

  // 【】を含むタイトル
  const withBrackets = notFoundList.filter(job =>
    job.title.includes('【') || job.title.includes('】')
  )
  console.log(`📌 【】を含むタイトル: ${withBrackets.length}件 (${Math.round(withBrackets.length / notFoundList.length * 100)}%)`)

  // 中黒を含むタイトル
  const withMiddleDot = notFoundList.filter(job =>
    job.title.includes('・')
  )
  console.log(`📌 ・を含むタイトル: ${withMiddleDot.length}件 (${Math.round(withMiddleDot.length / notFoundList.length * 100)}%)`)

  // サンプルを表示
  console.log('\n=== 問題のあるタイトルのサンプル ===\n')
  notFoundList.slice(0, 15).forEach((job, index) => {
    console.log(`${index + 1}. "${job.title}"`)
    console.log(`   企業: ${job.company_name}`)
    if (job.actualFiles && job.actualFiles.length > 0) {
      console.log(`   参考PDF: ${job.actualFiles[0]}`)
    }
    console.log('')
  })
}

// 実行
checkAllPDFs().catch(console.error)
