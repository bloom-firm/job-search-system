import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
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

function sanitizeFileName(name) {
  return name.split('/').map(segment => {
    if (segment.endsWith('.pdf')) {
      const nameWithoutExt = segment.slice(0, -4)
      return encodeURIComponent(nameWithoutExt) + '.pdf'
    }
    return encodeURIComponent(segment)
  }).join('/')
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
        const encodedPath = sanitizeFileName(originalPath)
        files.push({
          localPath: fullPath,
          originalPath: originalPath,
          remotePath: encodedPath,
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
  console.log('\n📄 デバッグ: 最初の1件のパス:')
  const firstFile = pdfFiles[0]
  console.log(`  元のパス: ${firstFile.originalPath}`)
  console.log(`  エンコード後: ${firstFile.remotePath}`)
  
  console.log('\n🚀 アップロードを開始します...\n')

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < pdfFiles.length; i++) {
    const { localPath, originalPath, remotePath } = pdfFiles[i]
    
    const displayName = originalPath.length > 60 ? originalPath.slice(0, 60) + '...' : originalPath
    process.stdout.write(`[${i + 1}/${pdfFiles.length}] ${displayName} `)

    try {
      const fileBuffer = fs.readFileSync(localPath)
      
      // デバッグ: 最初のファイルで実際のパスを確認
      if (i === 0) {
        console.log(`\n  [DEBUG] アップロード先: ${remotePath}`)
      }
      
      const { error } = await supabase.storage
        .from('job-pdfs')
        .upload(remotePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (error) {
        console.log(`❌`)
        if (i < 5) {
          console.error(`  [DEBUG] エラー詳細:`, JSON.stringify(error, null, 2))
        } else {
          console.error(`  エラー: ${error.message}`)
        }
        errors.push({ file: originalPath, error: error.message })
        errorCount++
      } else {
        console.log(`✅`)
        successCount++
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
    
    // 最初の5件でエラーが続く場合は停止
    if (i >= 4 && errorCount === i + 1) {
      console.log('\n⚠️  最初の5件すべてが失敗しました。設定を確認してください。')
      process.exit(1)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 アップロード完了')
  console.log('='.repeat(50))
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`❌ 失敗: ${errorCount}件`)
  console.log(`📊 成功率: ${((successCount / pdfFiles.length) * 100).toFixed(1)}%`)
  
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
