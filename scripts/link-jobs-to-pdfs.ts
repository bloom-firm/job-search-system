import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getAllJobs() {
  const allJobs: any[] = []
  let offset = 0
  const limit = 1000

  console.log('📥 求人データを取得中...')

  while (true) {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, company_name')
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ 取得エラー:', error)
      break
    }

    if (!jobs || jobs.length === 0) {
      break
    }

    allJobs.push(...jobs)
    console.log(`  📦 ${allJobs.length}件取得済み...`)

    if (jobs.length < limit) {
      break
    }

    offset += limit
  }

  return allJobs
}

async function linkJobsToPdfs() {
  console.log('🔗 求人とPDFマッピングを紐付けます...\n')

  // すべての求人を取得（ページネーション対応）
  const jobs = await getAllJobs()

  if (jobs.length === 0) {
    console.error('❌ 求人が取得できませんでした')
    return
  }

  console.log(`\n📊 ${jobs.length}件の求人を取得しました`)
  console.log('🔄 紐付けを開始します...\n')

  let successCount = 0
  let notFoundCount = 0
  let errorCount = 0

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]

    // 進捗表示（100件ごと）
    if ((i + 1) % 100 === 0) {
      console.log(`📊 進捗: ${i + 1}/${jobs.length} (成功: ${successCount}, 未発見: ${notFoundCount})`)
    }

    try {
      // company_nameとjob_titleで部分一致検索
      const { data: mappings, error: mappingError } = await supabase
        .from('pdf_mappings')
        .select('id, job_title')
        .eq('company_name', job.company_name)
        .ilike('job_title', `%${job.title}%`)
        .limit(1)

      if (mappingError) {
        console.error(`❌ エラー [${job.company_name}]: ${mappingError.message}`)
        errorCount++
        continue
      }

      if (mappings && mappings.length > 0) {
        // job_idを更新
        const { error: updateError } = await supabase
          .from('pdf_mappings')
          .update({ job_id: job.id })
          .eq('id', mappings[0].id)

        if (updateError) {
          console.error(`❌ 更新失敗 [${job.title}]: ${updateError.message}`)
          errorCount++
        } else {
          successCount++
        }
      } else {
        notFoundCount++
      }
    } catch (error) {
      console.error(`❌ 例外エラー [${job.company_name} - ${job.title}]:`, error)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 紐付け完了')
  console.log('='.repeat(50))
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`⚠️  PDF未発見: ${notFoundCount}件`)
  console.log(`❌ エラー: ${errorCount}件`)
  console.log(`📊 成功率: ${((successCount / jobs.length) * 100).toFixed(1)}%`)
}

linkJobsToPdfs()
