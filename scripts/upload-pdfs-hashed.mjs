import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: 環境変数が設定されていません')
  process.exit(1)
}
console.log('✅ Supabase接続設定完了')
console.log('URL:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
const pdfDir = path.join(__dirname, '..', 'public', 'pdf')
// ファイルパスからハッシュを生成（一意なファイル名）
function generateHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex')
}
function getPDFFiles(dir, baseDir = dir) {
  const files = []
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      if (item.name.startsWith('.')) continue
      if (item.isDirectory()) {
        files.push(...getPDFFiles(fullPath, baseDir))
      } else if (item.name.toLowerCase().endsWith('.pdf')) {
        const relativePath = path.relative(baseDir, fullPath)
        const originalPath = relativePath.replace(/\\/g, '/')
        
        // 会社名とファイル名を分離
        const parts = originalPath.split('/')
        const companyName = parts[0]
        const fileName = parts[1] || 'unknown.pdf'
        
        // ハッシュ化されたファイル名を生成
        const hash = generateHash(originalPath)
        const hashedFileName = `${hash}.pdf`
        
        files.push({
          localPath: fullPath,
          originalPath: originalPath,
          companyName: companyName,
          jobTitle: fileName.replace('.pdf', ''),
          remotePath: hashedFileName, // シンプルなハッシュ名
          size: fs.statSync(fullPath).size
        })
      }
    }
  } catch (error) {
    console.error(`❌ フォルダ読み込みエラー: ${dir}`, error.message)
  }
  return files
}
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

async function uploadPDFs() {
  console.log('\n📁 PDFファイルをスキャン中...')
  
  if (!fs.existsSync(pdfDir)) {
    console.error('❌ エラー: PDFフォルダが見つかりません:', pdfDir)
    process.exit(1)
  }
  
  const pdfFiles = getPDFFiles(pdfDir)
  
  if (pdfFiles.length === 0) {
    console.error('❌ PDFファイルが見つかりませんでした')
    process.exit(1)
  }
  
  const totalSize = pdfFiles.reduce((sum, file) => sum + file.size, 0)
  
  console.log(`✅ ${pdfFiles.length}個のPDFファイルが見つかりました`)
  console.log(`📊 合計サイズ: ${formatBytes(totalSize)}`)
  console.log('\n📄 最初の3件:')
  pdfFiles.slice(0, 3).forEach((file, i) => {
    console.log(`  ${i + 1}. ${file.originalPath}`)
    console.log(`     → ${file.remotePath}`)
  })
  
  console.log('\n🚀 アップロードを開始します...\n')

  let successCount = 0
  let errorCount = 0
  const errors = []
  const mapping = [] // マッピング情報を保存

  for (let i = 0; i < pdfFiles.length; i++) {
    const { localPath, originalPath, companyName, jobTitle, remotePath } = pdfFiles[i]
    
    const displayName = originalPath.length > 60 ? originalPath.slice(0, 60) + '...' : originalPath
    process.stdout.write(`[${i + 1}/${pdfFiles.length}] ${displayName} `)

    try {
      const fileBuffer = fs.readFileSync(localPath)
      
      const { error } = await supabase.storage
        .from('job-pdfs')
        .upload(remotePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (error) {
        console.log(`❌`)
        console.error(`  エラー: ${error.message}`)
        errors.push({ file: originalPath, error: error.message })
        errorCount++
      } else {
        console.log(`✅`)
        successCount++
        
        // マッピング情報を保存
        mapping.push({
          company_name: companyName,
          job_title: jobTitle,
          pdf_filename: remotePath,
          original_path: originalPath
        })
      }
    } catch (error) {
      console.log(`❌`)
      console.error(`  エラー: ${error.message}`)
      errors.push({ file: originalPath, error: error.message })
      errorCount++
    }

    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 進捗: ${i + 1}/${pdfFiles.length} (成功: ${successCount}, 失敗: ${errorCount})\n`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 アップロード完了')
  console.log('='.repeat(50))
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`❌ 失敗: ${errorCount}件`)
  console.log(`📊 成功率: ${((successCount / pdfFiles.length) * 100).toFixed(1)}%`)
  
  // マッピングファイルを保存
  if (mapping.length > 0) {
    const mappingPath = path.join(__dirname, '..', 'pdf-mapping.json')
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2))
    console.log(`\n📄 マッピングファイルを保存しました: ${mappingPath}`)
    console.log(`   このファイルを使ってデータベースを更新してください。`)
  }
  
  if (errors.length > 0) {
    console.log('\n❌ エラーが発生したファイル:')
    errors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... 他 ${errors.length - 10}件`)
    }
  }
}
uploadPDFs().catch(error => {
  console.error('❌ 予期しないエラー:', error)
  process.exit(1)
})
