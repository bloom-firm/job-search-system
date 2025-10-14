// Supabaseの1000件制限をテスト
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

async function testLimit() {
  console.log('=== Supabase取得件数制限テスト ===\n')

  // 1. limitなし（デフォルト1000件制限）
  console.log('1. .limit()なしの場合（デフォルト）:')
  const combinedCondition = `title.ilike.%PM%,company_name.ilike.%PM%,description.ilike.%PM%,requirements.ilike.%PM%,preferred_skills.ilike.%PM%,location.ilike.%PM%,job_type.ilike.%PM%,industry_category.ilike.%PM%,employment_type.ilike.%PM%,title.ilike.%不動産%,company_name.ilike.%不動産%,description.ilike.%不動産%,requirements.ilike.%不動産%,preferred_skills.ilike.%不動産%,location.ilike.%不動産%,job_type.ilike.%不動産%,industry_category.ilike.%不動産%,employment_type.ilike.%不動産%`

  const { data: data1 } = await supabase
    .from('jobs')
    .select('id')
    .or(combinedCondition)

  console.log(`   取得件数: ${data1?.length || 0}件`)

  // 2. limit(10000)あり
  console.log('\n2. .limit(10000)ありの場合:')
  const { data: data2 } = await supabase
    .from('jobs')
    .select('id')
    .or(combinedCondition)
    .limit(10000)

  console.log(`   取得件数: ${data2?.length || 0}件`)

  // 3. 実際にフィルタリング
  console.log('\n3. クライアント側AND検索シミュレーション:')
  const keywords = ['PM', '不動産']

  const { data: allData } = await supabase
    .from('jobs')
    .select('*')
    .or(combinedCondition)
    .limit(10000)

  const filtered = allData?.filter(job => {
    return keywords.every(keyword => {
      const regex = new RegExp(keyword, 'i')
      return (
        regex.test(job.title || '') ||
        regex.test(job.company_name || '') ||
        regex.test(job.description || '') ||
        regex.test(job.requirements || '') ||
        regex.test(job.preferred_skills || '') ||
        regex.test(job.location || '') ||
        regex.test(job.job_type || '') ||
        regex.test(job.industry_category || '') ||
        regex.test(job.employment_type || '')
      )
    })
  })

  console.log(`   DB取得: ${allData?.length || 0}件`)
  console.log(`   AND検索後: ${filtered?.length || 0}件`)

  console.log('\n=== テスト完了 ===')
}

testLimit().catch(console.error)
