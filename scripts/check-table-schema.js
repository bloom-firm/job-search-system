// jobsテーブルのスキーマを確認
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('=== jobsテーブルのカラム確認 ===\n')

  // サンプルデータを1件取得してカラムを確認
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .limit(1)

  if (error) {
    console.error('エラー:', error)
    return
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0])
    console.log('カラム一覧:')
    columns.forEach((col, index) => {
      const value = data[0][col]
      const type = typeof value
      const preview = type === 'string' && value ? value.substring(0, 50) : value
      console.log(`  ${index + 1}. ${col} (${type}): ${preview}`)
    })

    // original_md_contentの有無を確認
    console.log('\n=== original_md_content カラムの確認 ===')
    if (columns.includes('original_md_content')) {
      console.log('✅ original_md_content カラムが存在します')

      const content = data[0].original_md_content
      if (content) {
        console.log(`\n内容プレビュー (最初の200文字):`)
        console.log(content.substring(0, 200))
        console.log(`\n文字数: ${content.length}文字`)
      } else {
        console.log('⚠️ 値がNULLです')
      }
    } else {
      console.log('❌ original_md_content カラムは存在しません')
    }

    // original_md_contentにデータが入っている件数を確認
    console.log('\n=== original_md_content にデータがある求人数 ===')
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .not('original_md_content', 'is', null)

    console.log(`データがある件数: ${count}件`)

    // 全求人数
    const { count: totalCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })

    console.log(`総求人数: ${totalCount}件`)
  }

  console.log('\n=== 確認完了 ===')
}

checkSchema().catch(console.error)
