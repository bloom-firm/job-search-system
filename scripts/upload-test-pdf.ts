/**
 * Test PDF Upload Script
 *
 * テスト用にPDFファイルをSupabase Storageにアップロードします
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

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // PDFディレクトリのパス（適宜変更してください）
  const pdfDir = path.join(process.cwd(), 'hashed-pdfs')

  try {
    const files = await fs.readdir(pdfDir)
    console.log(`📁 Found ${files.length} files in ${pdfDir}`)

    for (const file of files) {
      if (!file.endsWith('.pdf')) {
        console.log(`⏭️  Skipping non-PDF file: ${file}`)
        continue
      }

      const filePath = path.join(pdfDir, file)
      const fileBuffer = await fs.readFile(filePath)

      console.log(`\n📤 Uploading ${file}...`)

      const { data, error } = await supabase.storage
        .from('job-pdfs')
        .upload(file, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true // 既存ファイルを上書き
        })

      if (error) {
        console.error(`❌ Failed to upload ${file}:`, error)
      } else {
        console.log(`✅ Successfully uploaded: ${data.path}`)
      }
    }

    console.log('\n✨ Upload completed!')

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ Directory not found: ${pdfDir}`)
      console.log('💡 Tip: ハッシュ化されたPDFファイルを "hashed-pdfs" フォルダに配置してください')
    } else {
      throw error
    }
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
