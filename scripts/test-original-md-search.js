// original_md_contentでの検索テスト
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

async function testOriginalMdSearch() {
  console.log('='.repeat(80))
  console.log('original_md_content検索テスト')
  console.log('='.repeat(80))

  // テストキーワード
  const testKeywords = [
    'PM',
    '不動産',
    'Python',
    'AWS',
    'リモート'
  ]

  for (const keyword of testKeywords) {
    console.log(`\n【キーワード: ${keyword}】`)

    // 1. original_md_contentのみで検索
    const { data: mdOnly, error: mdError } = await supabase
      .from('jobs')
      .select('id, title, company_name, original_md_content')
      .ilike('original_md_content', `%${keyword}%`)
      .limit(5)

    if (mdError) {
      console.error('  エラー:', mdError)
      continue
    }

    console.log(`  original_md_contentでヒット: ${mdOnly?.length || 0}件`)

    if (mdOnly && mdOnly.length > 0) {
      mdOnly.forEach((job, index) => {
        console.log(`\n  ${index + 1}. ${job.title} (${job.company_name})`)

        // キーワードが含まれる部分を抽出
        const content = job.original_md_content || ''
        const keywordIndex = content.toLowerCase().indexOf(keyword.toLowerCase())

        if (keywordIndex !== -1) {
          const start = Math.max(0, keywordIndex - 30)
          const end = Math.min(content.length, keywordIndex + keyword.length + 30)
          const snippet = content.substring(start, end)
          console.log(`     → ...${snippet}...`)
        }
      })
    }

    // 2. 他のカラムでもヒットするか確認
    const { data: otherColumns } = await supabase
      .from('jobs')
      .select('id')
      .or(`title.ilike.%${keyword}%,company_name.ilike.%${keyword}%,description.ilike.%${keyword}%,requirements.ilike.%${keyword}%`)
      .limit(1000)

    console.log(`  他のカラムでヒット: ${otherColumns?.length || 0}件`)

    // 3. original_md_contentのみでヒットする求人数
    const mdOnlyIds = new Set(mdOnly?.map(j => j.id) || [])
    const otherIds = new Set(otherColumns?.map(j => j.id) || [])

    const uniqueToMd = Array.from(mdOnlyIds).filter(id => !otherIds.has(id))
    console.log(`  original_md_contentのみでヒット: ${uniqueToMd.length}件`)
  }

  // 4. 「PM」AND「不動産」の検索テスト
  console.log('\n' + '='.repeat(80))
  console.log('【複合検索テスト: PM AND 不動産】')
  console.log('='.repeat(80))

  const keywords = ['PM', '不動産']

  // ORで取得
  const orCondition = keywords.map(kw =>
    `title.ilike.%${kw}%,company_name.ilike.%${kw}%,description.ilike.%${kw}%,requirements.ilike.%${kw}%,preferred_skills.ilike.%${kw}%,location.ilike.%${kw}%,job_type.ilike.%${kw}%,industry_category.ilike.%${kw}%,employment_type.ilike.%${kw}%,original_md_content.ilike.%${kw}%`
  ).join(',')

  const { data: allJobs } = await supabase
    .from('jobs')
    .select('*')
    .or(orCondition)
    .limit(10000)

  console.log(`\nDB取得（OR検索）: ${allJobs?.length || 0}件`)

  // クライアント側ANDフィルタ
  const andFiltered = allJobs?.filter(job => {
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
        regex.test(job.employment_type || '') ||
        regex.test(job.original_md_content || '')
      )
    })
  })

  console.log(`AND検索後: ${andFiltered?.length || 0}件`)

  // original_md_contentのおかげで見つかった求人
  const foundByMdContent = andFiltered?.filter(job => {
    const hasPMInMd = /PM/i.test(job.original_md_content || '')
    const hasFudosanInMd = /不動産/i.test(job.original_md_content || '')

    const hasPMInOther =
      /PM/i.test(job.title || '') ||
      /PM/i.test(job.company_name || '') ||
      /PM/i.test(job.description || '') ||
      /PM/i.test(job.requirements || '')

    const hasFudosanInOther =
      /不動産/i.test(job.title || '') ||
      /不動産/i.test(job.company_name || '') ||
      /不動産/i.test(job.description || '') ||
      /不動産/i.test(job.requirements || '')

    // original_md_contentでしか見つからないパターン
    return (hasPMInMd && !hasPMInOther) || (hasFudosanInMd && !hasFudosanInOther)
  })

  console.log(`\noriginal_md_contentのおかげで見つかった求人: ${foundByMdContent?.length || 0}件`)

  if (foundByMdContent && foundByMdContent.length > 0) {
    console.log('\n詳細:')
    foundByMdContent.slice(0, 5).forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title} (${job.company_name})`)
      console.log(`   年収: ${job.salary_min || 'N/A'}-${job.salary_max || 'N/A'}万円`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('テスト完了')
  console.log('='.repeat(80))
}

testOriginalMdSearch().catch(console.error)
