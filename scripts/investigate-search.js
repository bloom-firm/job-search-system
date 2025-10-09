// フリーワード検索の問題を調査するスクリプト
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .env.localを読み込む
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigate() {
  console.log('='.repeat(80))
  console.log('フリーワード検索調査レポート')
  console.log('='.repeat(80))

  // 1. 総求人数
  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
  console.log(`\n1. データベース内の総求人数: ${totalJobs}件`)

  // 2. 「PM」を含む求人数
  console.log('\n2. 「PM」を含む求人数:')
  const pmCondition = `title.ilike.%PM%,company_name.ilike.%PM%,description.ilike.%PM%,requirements.ilike.%PM%,preferred_skills.ilike.%PM%,location.ilike.%PM%,job_type.ilike.%PM%,industry_category.ilike.%PM%,employment_type.ilike.%PM%`
  const { data: pmJobs } = await supabase
    .from('jobs')
    .select('id, title, company_name, requirements')
    .or(pmCondition)
  console.log(`   - OR検索でヒット: ${pmJobs?.length || 0}件`)

  // 3. 「不動産」を含む求人数
  console.log('\n3. 「不動産」を含む求人数:')
  const fudosanCondition = `title.ilike.%不動産%,company_name.ilike.%不動産%,description.ilike.%不動産%,requirements.ilike.%不動産%,preferred_skills.ilike.%不動産%,location.ilike.%不動産%,job_type.ilike.%不動産%,industry_category.ilike.%不動産%,employment_type.ilike.%不動産%`
  const { data: fudosanJobs } = await supabase
    .from('jobs')
    .select('id, title, company_name, description')
    .or(fudosanCondition)
  console.log(`   - OR検索でヒット: ${fudosanJobs?.length || 0}件`)

  // 4. 「PM」OR「不動産」を含む求人数（DB側のOR検索）
  console.log('\n4. 「PM」OR「不動産」（DB側のOR検索結果）:')
  const combinedCondition = `title.ilike.%PM%,company_name.ilike.%PM%,description.ilike.%PM%,requirements.ilike.%PM%,preferred_skills.ilike.%PM%,location.ilike.%PM%,job_type.ilike.%PM%,industry_category.ilike.%PM%,employment_type.ilike.%PM%,title.ilike.%不動産%,company_name.ilike.%不動産%,description.ilike.%不動産%,requirements.ilike.%不動産%,preferred_skills.ilike.%不動産%,location.ilike.%不動産%,job_type.ilike.%不動産%,industry_category.ilike.%不動産%,employment_type.ilike.%不動産%`
  const { data: combinedJobs } = await supabase
    .from('jobs')
    .select('*')
    .or(combinedCondition)
  console.log(`   - DB取得件数: ${combinedJobs?.length || 0}件`)

  // 5. クライアント側AND検索のシミュレーション
  console.log('\n5. クライアント側AND検索（「PM」AND「不動産」）:')
  const keywords = ['PM', '不動産']
  const andFilteredJobs = combinedJobs?.filter(job => {
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
  console.log(`   - AND検索後: ${andFilteredJobs?.length || 0}件`)

  // 6. AND検索でヒットした求人の詳細
  if (andFilteredJobs && andFilteredJobs.length > 0) {
    console.log('\n6. AND検索でヒットした求人:')
    andFilteredJobs.forEach((job, index) => {
      console.log(`\n   ${index + 1}. ${job.title} (${job.company_name})`)
      console.log(`      年収: ${job.salary_min || 'N/A'}-${job.salary_max || 'N/A'}万円`)
      console.log(`      勤務地: ${job.location || 'N/A'}`)

      // PMがどこで見つかったか
      const pmIn = []
      if (/PM/i.test(job.title)) pmIn.push('title')
      if (/PM/i.test(job.requirements)) pmIn.push('requirements')
      if (/PM/i.test(job.description)) pmIn.push('description')
      if (/PM/i.test(job.preferred_skills)) pmIn.push('preferred_skills')
      console.log(`      「PM」が見つかった場所: ${pmIn.join(', ')}`)

      // 不動産がどこで見つかったか
      const fudosanIn = []
      if (/不動産/i.test(job.title)) fudosanIn.push('title')
      if (/不動産/i.test(job.company_name)) fudosanIn.push('company_name')
      if (/不動産/i.test(job.description)) fudosanIn.push('description')
      if (/不動産/i.test(job.requirements)) fudosanIn.push('requirements')
      console.log(`      「不動産」が見つかった場所: ${fudosanIn.join(', ')}`)
    })
  }

  // 7. 年収フィルタの影響を確認
  console.log('\n7. 年収フィルタの影響（デフォルト: 300-2000万円）:')
  const salaryFilteredJobs = andFilteredJobs?.filter(job => {
    const salaryMin = job.salary_min || 0
    const salaryMax = job.salary_max || 9999
    // デフォルトフィルタ: 300-2000万円
    return salaryMin <= 2000 && salaryMax >= 300
  })
  console.log(`   - 年収フィルタ適用前: ${andFilteredJobs?.length || 0}件`)
  console.log(`   - 年収フィルタ適用後: ${salaryFilteredJobs?.length || 0}件`)
  console.log(`   - 除外された件数: ${(andFilteredJobs?.length || 0) - (salaryFilteredJobs?.length || 0)}件`)

  // 8. 年収フィルタで除外された求人
  const excludedBySalary = andFilteredJobs?.filter(job => {
    const salaryMin = job.salary_min || 0
    const salaryMax = job.salary_max || 9999
    return !(salaryMin <= 2000 && salaryMax >= 300)
  })
  if (excludedBySalary && excludedBySalary.length > 0) {
    console.log('\n8. 年収フィルタで除外された求人:')
    excludedBySalary.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} (${job.company_name})`)
      console.log(`      年収: ${job.salary_min || 'N/A'}-${job.salary_max || 'N/A'}万円`)
    })
  }

  // 9. 年収データの分布
  console.log('\n9. 年収データの分布:')
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('salary_min, salary_max')

  const nullMin = allJobs?.filter(j => j.salary_min === null).length || 0
  const nullMax = allJobs?.filter(j => j.salary_max === null).length || 0
  const inRange = allJobs?.filter(j => (j.salary_min || 0) <= 2000 && (j.salary_max || 9999) >= 300).length || 0
  const outOfRange = (allJobs?.length || 0) - inRange

  console.log(`   - salary_min が NULL: ${nullMin}件`)
  console.log(`   - salary_max が NULL: ${nullMax}件`)
  console.log(`   - デフォルト範囲内(300-2000万円): ${inRange}件`)
  console.log(`   - デフォルト範囲外: ${outOfRange}件`)

  console.log('\n' + '='.repeat(80))
  console.log('調査完了')
  console.log('='.repeat(80))
}

investigate().catch(console.error)
