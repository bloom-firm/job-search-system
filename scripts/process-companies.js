// scripts/process-companies.js - GPT-5版（完全）
const fs = require('fs').promises
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const RAW_DIR = path.join(__dirname, '../src/data/companies/raw')
const PROCESSED_DIR = path.join(__dirname, '../src/data/companies/processed')
const MASTER_FILE = path.join(PROCESSED_DIR, 'companies_master.json')
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// convertToJSON関数（全面改善版）
function convertToJSON(filename, rawText) {
  const companyName = filename.replace('.txt', '')
  const lines = rawText.split('\n')

  const result = {
    company_name: companyName,
    public: {
      basic_info: {
        official_name: companyName,
        founded: '',
        headquarters: '',
        employees: '',
        listing_status: '',
        business_description: '',
        location: ''
      },
      work_style: {
        work_format: '',
        annual_holidays: '',
        benefits: ''
      }
    },
    confidential: {
      selection_process: {
        flow: '',
        speed: '',
        key_points: []
      },
      recruitment_reality: {
        education_requirements: '',
        job_change_limit: '',
        age_preference: '',
        other_criteria: [],
        characteristics: []
      },
      internal_memo: {
        company_characteristics: [],
        selection_notes: [],
        proposal_tips: [],
        other_notes: []
      },
      ng_items: {
        concurrent_ng_companies: [],
        reapplication_rule: '',
        applied_candidates_notes: '',
        other_prohibitions: []
      },
      application_system: {
        url: '',
        id: '',
        password: '',
        special_notes: '',
        ats: ''
      },
      contract_info: {
        commission_rate: '',
        refund_policy: {},
        contract_period: '',
        special_terms: '',
        contract_status: '',
        email: '',
        url: ''
      },
      target_details: {
        desired_profiles: [],
        target_companies: [],
        technical_requirements: [],
        department_needs: []
      }
    }
  }

  // 契約情報の抽出
  if (rawText.match(/契約状況\s*契約有り/)) {
    result.confidential.contract_info.contract_status = '契約有り'
  }

  const contractPeriodMatch = rawText.match(/契約期間\s*(\d{4}-\d{2}-\d{2})\s*~/)
  if (contractPeriodMatch) {
    result.confidential.contract_info.contract_period = contractPeriodMatch[1] + ' ~'
  }

  const commissionMatch = rawText.match(/紹介料率\s*\(%\)\s*([\d.]+)%/)
  if (commissionMatch) {
    result.confidential.contract_info.commission_rate = commissionMatch[1] + '%'
  }

  // 返金ポリシーの抽出
  const refundPolicyMatch = rawText.match(/返金ポリシー\s*([^\n]+)/i)
  if (refundPolicyMatch) {
    const policyText = refundPolicyMatch[1]
    const policies = {}
    const monthMatches = policyText.matchAll(/(\d+)[カヶか月]+\s*(\d+)[％%]/g)
    for (const match of monthMatches) {
      policies[`${match[1]}ヶ月`] = `${match[2]}%`
    }
    result.confidential.contract_info.refund_policy = policies
  }

  // メールアドレスの抽出
  const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) {
    result.confidential.contract_info.email = emailMatch[1]
  }

  // URLの抽出（企業URL）
  const urlMatch = rawText.match(/URL\s*(https?:\/\/[^\s]+)/i) || rawText.match(/企業のWeb\s*(https?:\/\/[^\s]+)/i)
  if (urlMatch) {
    result.confidential.contract_info.url = urlMatch[1]
  }

  // 応募システムの抽出
  const applicationUrlMatch = rawText.match(/https:\/\/[^\s]*jposting[^\s]*/i) || rawText.match(/応募方法[^\n]*\n+\s*(https?:\/\/[^\s]+)/i)
  if (applicationUrlMatch) {
    result.confidential.application_system.url = applicationUrlMatch[0] || applicationUrlMatch[1]
  }

  const idMatch = rawText.match(/■?ID\s*\n?\s*(\S+)/i)
  if (idMatch) {
    result.confidential.application_system.id = idMatch[1]
  }

  const passwordMatch = rawText.match(/■?パスワード\s*\n?\s*(\S+)/i)
  if (passwordMatch) {
    result.confidential.application_system.password = passwordMatch[1]
  }

  // ATSシステムの抽出（HRMOS等）
  const atsMatch = rawText.match(/(HRMOS|ベイカレント専用|マイナビ|doda|リクルート)/i)
  if (atsMatch) {
    result.confidential.application_system.ats = atsMatch[1]
  }

  // 採用要件の抽出
  const educationMatch = rawText.match(/(MARCH以上|高専卒以上|高校以上|大卒以上|学歴不問)/i)
  if (educationMatch) {
    result.confidential.recruitment_reality.education_requirements = educationMatch[1]
  }

  const experienceMatch = rawText.match(/社会人経験[３3]年以上|実務経験[５5]年以上|エンジニア経験\d+年以上/i)
  if (experienceMatch) {
    result.confidential.recruitment_reality.other_criteria.push(experienceMatch[0])
  }

  // NG事項の抽出
  const ngCompaniesMatch = rawText.match(/※?([^※\n]+)との?併願NG/i)
  if (ngCompaniesMatch) {
    const companies = ngCompaniesMatch[1].split(/[、,（）()]/).filter(c => c.trim())
    result.confidential.ng_items.concurrent_ng_companies = companies
  }

  // 企業特徴の抽出（箇条書き部分）
  const characteristicsMatch = rawText.match(/"([^"]+)"/g)
  if (characteristicsMatch) {
    characteristicsMatch.forEach(match => {
      const content = match.replace(/"/g, '').trim()
      const items = content.split(/\n/).filter(line => line.trim().startsWith('・') || line.trim().startsWith('-'))
      if (items.length > 0) {
        result.confidential.internal_memo.company_characteristics.push(...items.map(i => i.trim()))
      }
    })
  }

  // 離職率の抽出
  const turnoverMatch = rawText.match(/離職率\s*(\d+\.?\d*)%/i)
  if (turnoverMatch) {
    result.confidential.recruitment_reality.other_criteria.push(`離職率${turnoverMatch[1]}%`)
  }

  // 従業員数の抽出（rawテキストから）
  const employeeMatch = rawText.match(/従業員数\s*(\d+[,、]?\d*)\s*人/i) || rawText.match(/(\d{3,})\s*人/)
  if (employeeMatch) {
    result.public.basic_info.employees = employeeMatch[1].replace(/[,、]/g, '') + '名'
  }

  return result
}

// GPT-5で補完する関数
async function supplementWithGPT5(companyName, basicInfo) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️  OpenAI APIキーが設定されていません。補完をスキップします。')
    return basicInfo
  }

  console.log(`🤖 GPT-5で ${companyName} の詳細情報を調査中...`)

  try {
    const prompt = `あなたは日本企業の詳細情報を調査する専門家です。以下の企業について、Web検索を実行し、公式サイトやIR情報から正確な情報を取得してください。

企業名: ${companyName}

【重要な指示】
- 必ず実際の具体的な値を返してください
- 「要確認」「不明」「アクセスが必要」などの文言は絶対に使用しないでください
- 情報が見つからない場合は、業界標準や企業規模から合理的な推定値を記載してください
- 全ての項目に必ず具体的な値を入力してください

以下のJSON形式で、全項目を具体的な値で補完して回答してください：
{
  "official_name": "正式な法人名（株式会社等を含む完全名称）",
  "founded": "設立年月日（例: 2019年9月2日、または 2019年9月）",
  "headquarters": "本社所在地（都道府県市区町村まで、例: 東京都港区虎ノ門）",
  "employees": "従業員数（例: 約500名、または 500名）",
  "listing_status": "上場状況（東証プライム/スタンダード/グロース/未上場のいずれか）",
  "business_description": "事業内容の詳細説明（100-200文字程度の具体的な説明）",
  "location": "その他の事業所・拠点情報（例: 大阪、名古屋に拠点あり、または 本社のみ）"
}

必ず全項目に具体的な値を入れてください。曖昧な表現や確認を求める文言は禁止です。`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: '日本企業の詳細情報を正確に調査する専門家として、全ての公開情報を補完してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GPT-5 API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const supplemented = JSON.parse(data.choices[0].message.content)
    
    const result = {
      official_name: supplemented.official_name || basicInfo.official_name || companyName,
      founded: supplemented.founded || basicInfo.founded || '',
      headquarters: supplemented.headquarters || basicInfo.headquarters || '',
      employees: supplemented.employees || basicInfo.employees || '',
      listing_status: supplemented.listing_status || basicInfo.listing_status || '',
      business_description: supplemented.business_description || basicInfo.business_description || '',
      location: supplemented.location || basicInfo.location || ''
    }

    console.log(`   ✅ 補完完了`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    return result

  } catch (error) {
    console.error(`   ❌ 補完エラー: ${error.message}`)
    return basicInfo
  }
}

// メイン処理
async function processCompanies() {
  console.log('🚀 企業データ処理を開始します...\n')

  try {
    await fs.mkdir(PROCESSED_DIR, { recursive: true })
    const files = await fs.readdir(RAW_DIR)
    const txtFiles = files.filter(file => file.endsWith('.txt') || !file.includes('.'))

    console.log(`📁 ${txtFiles.length}個のファイルを検出しました`)
    console.log('─'.repeat(50))

    const results = []
    const errors = []

    for (let index = 0; index < txtFiles.length; index++) {
      const file = txtFiles[index]
      try {
        const filePath = path.join(RAW_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const jsonData = convertToJSON(file, content)
        
        const supplementedInfo = await supplementWithGPT5(
          jsonData.company_name,
          jsonData.public.basic_info
        )
        jsonData.public.basic_info = supplementedInfo

        const outputFileName = file.endsWith('.txt') ? file.replace('.txt', '.json') : `${file}.json`
        const outputPath = path.join(PROCESSED_DIR, outputFileName)
        await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8')

        results.push(jsonData)
        console.log(`✅ [${index + 1}/${txtFiles.length}] ${file} → ${outputFileName}`)

      } catch (error) {
        console.error(`❌ [${index + 1}/${txtFiles.length}] ${file}: ${error.message}`)
        errors.push({ file, error: error.message })
      }
    }

    console.log('\n✨ 処理が完了しました！')

  } catch (error) {
    console.error('\n💥 致命的なエラー:', error.message)
    process.exit(1)
  }
}

processCompanies()