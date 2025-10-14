/**
 * PDF Mappings Migration Script
 *
 * pdf-mapping.jsonのデータをSupabaseのpdf_mappingsテーブルに投入するスクリプト
 *
 * 実行方法:
 * npx tsx scripts/migrate-pdf-mappings.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

interface PdfMapping {
  company_name: string
  job_title: string
  pdf_filename: string
  original_path: string
}

async function main() {
  // 環境変数のチェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  // Supabaseクライアントの初期化（サービスロールキーを使用）
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // pdf-mapping.jsonの読み込み
  const jsonPath = path.join(process.cwd(), 'pdf-mapping.json')
  const jsonContent = await fs.readFile(jsonPath, 'utf-8')
  const mappings: PdfMapping[] = JSON.parse(jsonContent)

  console.log(`📄 Found ${mappings.length} PDF mappings to migrate`)

  // バッチサイズ
  const BATCH_SIZE = 100
  let successCount = 0
  let errorCount = 0
  const errors: Array<{ mapping: PdfMapping; error: string }> = []

  // バッチごとに処理
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE)

    console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mappings.length / BATCH_SIZE)}...`)

    // バッチ挿入
    const { data, error } = await supabase
      .from('pdf_mappings')
      .upsert(
        batch.map(m => ({
          company_name: m.company_name,
          job_title: m.job_title,
          pdf_filename: m.pdf_filename,
          original_path: m.original_path,
        })),
        {
          onConflict: 'pdf_filename',
          ignoreDuplicates: false
        }
      )
      .select()

    if (error) {
      console.error(`❌ Batch error:`, error)
      errorCount += batch.length
      batch.forEach(mapping => {
        errors.push({ mapping, error: error.message })
      })
    } else {
      const insertedCount = data?.length || 0
      successCount += insertedCount
      console.log(`✅ Successfully inserted/updated ${insertedCount} records`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`📝 Total: ${mappings.length}`)

  if (errors.length > 0) {
    console.log('\n❌ Error Details:')
    errors.slice(0, 10).forEach(({ mapping, error }) => {
      console.log(`  - ${mapping.company_name} / ${mapping.job_title}`)
      console.log(`    Error: ${error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`)
    }

    // エラーログをファイルに保存
    const errorLogPath = path.join(process.cwd(), 'pdf-migration-errors.json')
    await fs.writeFile(errorLogPath, JSON.stringify(errors, null, 2))
    console.log(`\n💾 Full error log saved to: ${errorLogPath}`)
  }

  console.log('\n✨ Migration completed!')
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
