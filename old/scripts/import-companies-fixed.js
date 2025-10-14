const fs = require('fs').promises
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const PROCESSED_DIR = path.join(__dirname, '../src/data/companies/processed')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkAndCreateTable() {
  console.log('🔍 テーブル構造を確認中...\n')

  // Check if companies_master table exists
  const { error: tableError } = await supabase
    .from('companies_master')
    .select('*')
    .limit(1)

  if (tableError) {
    console.log('⚠️  companies_masterテーブルが存在しないか、アクセスできません')
    console.log('📝 SQLファイルを確認してください: scripts/create-companies-table.sql\n')
    return false
  }

  console.log('✅ companies_masterテーブルが存在します\n')
  return true
}

async function importCompanies() {
  console.log('🚀 企業データのインポートを開始します...\n')

  // Check table first
  const tableExists = await checkAndCreateTable()
  if (!tableExists) {
    console.log('❌ テーブルが存在しません。先にSupabase SQL Editorで create-companies-table.sql を実行してください。')
    process.exit(1)
  }

  try {
    // Read all JSON files from processed directory
    const files = await fs.readdir(PROCESSED_DIR)
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'companies_master.json')

    console.log(`📁 ${jsonFiles.length}個のファイルを検出しました`)
    console.log('─'.repeat(50))

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (let index = 0; index < jsonFiles.length; index++) {
      const file = jsonFiles[index]
      try {
        const filePath = path.join(PROCESSED_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const companyData = JSON.parse(content)

        // Transform data for Supabase - map to JSONB columns
        const record = {
          company_name: companyData.company_name,
          basic_info: companyData.public?.basic_info || {},
          work_style: companyData.public?.work_style || {},
          selection_process: companyData.confidential?.selection_process || {},
          recruitment_reality: companyData.confidential?.recruitment_reality || {},
          internal_memo: companyData.confidential?.internal_memo || {},
          ng_items: companyData.confidential?.ng_items || {},
          application_system: companyData.confidential?.application_system || {},
          contract_info: companyData.confidential?.contract_info || {},
          target_details: companyData.confidential?.target_details || {}
        }

        console.log(`📤 [${index + 1}/${jsonFiles.length}] ${companyData.company_name} を送信中...`)

        // Insert or update (upsert) into Supabase
        const { error } = await supabase
          .from('companies_master')
          .upsert(record, {
            onConflict: 'company_name'
          })
          .select()

        if (error) {
          throw error
        }

        successCount++
        console.log(`   ✅ インポート成功`)

      } catch (error) {
        errorCount++
        console.error(`   ❌ エラー: ${error.message}`)
        errors.push({ file, error: error.message })
      }
    }

    console.log('─'.repeat(50))
    console.log('\n' + '='.repeat(50))
    console.log('📊 インポート結果')
    console.log('='.repeat(50))
    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ エラー: ${errorCount}件`)

    if (errors.length > 0) {
      console.log('\n⚠️  エラー詳細:')
      errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`)
      })
    }

    console.log('\n✨ インポートが完了しました！')

  } catch (error) {
    console.error('\n💥 致命的なエラーが発生しました:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
importCompanies()
