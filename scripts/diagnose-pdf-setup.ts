/**
 * PDF Setup Diagnostic Script
 *
 * PDFシステムの状態を診断します
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  console.log('🔍 PDF Setup Diagnostic\n')
  console.log('='.repeat(60))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. pdf_mappingsテーブルの確認
  console.log('\n1️⃣  Checking pdf_mappings table...')
  const { data: mappings, error: mappingsError } = await supabase
    .from('pdf_mappings')
    .select('*', { count: 'exact', head: false })
    .limit(5)

  if (mappingsError) {
    console.error('❌ Error querying pdf_mappings:', mappingsError.message)
  } else {
    console.log(`✅ pdf_mappings table exists`)
    console.log(`   Total records: ${mappings?.length || 0}`)
    if (mappings && mappings.length > 0) {
      console.log('\n   Sample records:')
      mappings.slice(0, 3).forEach((m: any) => {
        console.log(`   - ${m.company_name} / ${m.job_title}`)
        console.log(`     File: ${m.pdf_filename}`)
      })
    }
  }

  // 2. Storage バケットの確認
  console.log('\n2️⃣  Checking job-pdfs bucket...')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message)
  } else {
    const jobPdfsBucket = buckets?.find(b => b.name === 'job-pdfs')
    if (jobPdfsBucket) {
      console.log('✅ job-pdfs bucket exists')
      console.log(`   Public: ${jobPdfsBucket.public ? 'Yes' : 'No'}`)
    } else {
      console.error('❌ job-pdfs bucket NOT FOUND')
      console.log('   Available buckets:', buckets?.map(b => b.name).join(', '))
    }
  }

  // 3. Storage内のファイル確認
  console.log('\n3️⃣  Checking files in job-pdfs bucket...')
  const { data: files, error: filesError } = await supabase.storage
    .from('job-pdfs')
    .list('', { limit: 10 })

  if (filesError) {
    console.error('❌ Error listing files:', filesError.message)
  } else {
    console.log(`✅ Files in bucket: ${files?.length || 0}`)
    if (files && files.length > 0) {
      console.log('\n   Sample files:')
      files.slice(0, 5).forEach(f => {
        console.log(`   - ${f.name} (${(f.metadata?.size / 1024).toFixed(2)} KB)`)
      })
    } else {
      console.warn('⚠️  No files found in bucket')
    }
  }

  // 4. 署名付きURL生成のテスト
  if (files && files.length > 0) {
    console.log('\n4️⃣  Testing signed URL generation...')
    const testFile = files[0].name
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('job-pdfs')
      .createSignedUrl(testFile, 60)

    if (urlError) {
      console.error('❌ Error creating signed URL:', urlError.message)
    } else {
      console.log('✅ Signed URL generated successfully')
      console.log(`   URL: ${signedUrl?.signedUrl?.substring(0, 80)}...`)
    }
  }

  // 5. pdf-mapping.jsonの確認
  console.log('\n5️⃣  Checking pdf-mapping.json...')
  const jsonPath = path.join(process.cwd(), 'pdf-mapping.json')
  try {
    const jsonContent = await fs.readFile(jsonPath, 'utf-8')
    const mappingsJson = JSON.parse(jsonContent)
    console.log(`✅ pdf-mapping.json exists`)
    console.log(`   Total entries: ${mappingsJson.length}`)
    if (mappingsJson.length > 0) {
      console.log('\n   Sample entries:')
      mappingsJson.slice(0, 3).forEach((m: any) => {
        console.log(`   - ${m.company_name} / ${m.job_title}`)
        console.log(`     File: ${m.pdf_filename}`)
      })
    }
  } catch (error: any) {
    console.error('❌ Error reading pdf-mapping.json:', error.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Diagnostic Summary')
  console.log('='.repeat(60))

  // 推奨アクション
  console.log('\n📋 Recommended Actions:')

  if (!mappings || mappings.length === 0) {
    console.log('   ⚠️  Run: npx tsx scripts/migrate-pdf-mappings.ts')
  }

  if (!files || files.length === 0) {
    console.log('   ⚠️  Upload PDFs to Supabase Storage (job-pdfs bucket)')
    console.log('      - Use Supabase Dashboard > Storage > job-pdfs')
    console.log('      - Or create upload script')
  }

  if (mappings && mappings.length > 0 && files && files.length > 0) {
    console.log('   ✅ Everything looks good!')
    console.log('   🔍 If PDFs still not showing, check browser console for errors')
  }

  console.log('\n')
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
