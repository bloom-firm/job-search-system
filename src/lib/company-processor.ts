interface CompanyJSON {
  company_name: string
  public: {
    basic_info: {
      official_name: string
      founded: string
      headquarters: string
      employees: string
      business_description: string
    }
    work_style: {
      work_format: string
      annual_holidays: string
      benefits: string
    }
  }
  confidential: {
    selection_process: Record<string, any>
    recruitment_reality: Record<string, any>
    internal_memo: Record<string, any>
    ng_items: Record<string, any>
    application_system: Record<string, any>
    contract_info: Record<string, any>
    target_details: Record<string, any>
  }
}

export function convertToJSON(filename: string, rawText: string): CompanyJSON {
  const companyName = filename.replace('.txt', '')
  const lines = rawText.split('\n')

  // Initialize the structure
  const result: CompanyJSON = {
    company_name: companyName,
    public: {
      basic_info: {
        official_name: companyName,
        founded: '',
        headquarters: '',
        employees: '',
        business_description: ''
      },
      work_style: {
        work_format: '',
        annual_holidays: '',
        benefits: ''
      }
    },
    confidential: {
      selection_process: {},
      recruitment_reality: {
        characteristics: []
      },
      internal_memo: {},
      ng_items: {},
      application_system: {},
      contract_info: {},
      target_details: {}
    }
  }

  // Parse contract information
  const contractMatch = rawText.match(/契約状況\s*契約有り/)
  if (contractMatch) {
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

  // Parse refund policy
  const refundPolicy: Record<string, string> = {}
  const refundMatches = rawText.matchAll(/(\d+)[カヶか月]+\s*[以内超え]*\s*(\d+)[％%]/g)
  for (const match of refundMatches) {
    const months = match[1]
    const percent = match[2]
    refundPolicy[`${months}_month${months !== '1' ? 's' : ''}`] = `${percent}%`
  }
  if (Object.keys(refundPolicy).length > 0) {
    result.confidential.contract_info.refund_policy = refundPolicy
  }

  // Parse email
  const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (emailMatch) {
    result.confidential.contract_info.email = emailMatch[1]
  }

  // Parse URL
  const urlMatch = rawText.match(/URL\s*(https?:\/\/[^\s]+)/)
  if (urlMatch) {
    result.confidential.contract_info.url = urlMatch[1]
  }

  // Parse application system
  const atsMatch = rawText.match(/(HRMOS|専用|ATS)/i)
  if (atsMatch) {
    const atsLine = lines.find(line => line.includes(atsMatch[0]))
    if (atsLine) {
      result.confidential.application_system.ats = atsLine.trim()
    }
  }

  // Parse application URL
  const appUrlMatch = rawText.match(/(https?:\/\/[^\s]*(?:jposting|agent|recruit)[^\s]*)/)
  if (appUrlMatch) {
    result.confidential.application_system.url = appUrlMatch[1]
  }

  // Parse ID and Password
  const idMatch = rawText.match(/(?:■)?ID[：:\s]*([^\s\n]+)/)
  if (idMatch) {
    result.confidential.application_system.id = idMatch[1]
  }

  const passwordMatch = rawText.match(/(?:■)?(?:パスワード|PW|password)[：:\s]*([^\s\n]+)/)
  if (passwordMatch) {
    result.confidential.application_system.password = passwordMatch[1]
  }

  // Parse company characteristics (quoted sections often contain key info)
  const quotedSections = rawText.match(/"([^"]+)"/g)
  if (quotedSections) {
    const characteristics: string[] = []
    quotedSections.forEach(section => {
      const content = section.replace(/^"|"$/g, '')
      const bulletPoints = content.split(/[・\n]/).filter(s => s.trim().length > 0)
      characteristics.push(...bulletPoints.map(s => s.trim()))
    })
    if (characteristics.length > 0) {
      result.confidential.recruitment_reality.characteristics = characteristics
    }
  }

  // Parse employees
  const employeesMatch = rawText.match(/(?:社員|従業員[数数]?)[：:\s]*(\d+[人名]*)/)
  if (employeesMatch) {
    result.public.basic_info.employees = employeesMatch[1]
  }

  // Parse work format
  if (rawText.includes('リモート') || rawText.includes('フレックス')) {
    const workFormatMatch = rawText.match(/(リモート[可能]*|フレックス)[^\n]*/i)
    if (workFormatMatch) {
      result.public.work_style.work_format = workFormatMatch[0].trim()
    }
  }

  // Parse NG items
  const ngMatch = rawText.match(/(?:併願NG|NG|注意事項)[：:\s]*([^\n]+)/)
  if (ngMatch) {
    result.confidential.ng_items.note = ngMatch[1].trim()
  }

  // Parse adoption requirements
  const requirementsMatch = rawText.match(/採用要件[^\n]*\n"([^"]+)"/)
  if (requirementsMatch) {
    const requirements = requirementsMatch[1].split(/[・\n]/).filter(s => s.trim().length > 0)
    result.confidential.target_details.requirements = requirements.map(s => s.trim())
  }

  // Parse difficulty
  const difficultyMatch = rawText.match(/(?:難易度|採用難易度)\s*([A-Z])/)
  if (difficultyMatch) {
    result.confidential.target_details.difficulty = difficultyMatch[1]
  }

  // Parse company type
  const companyTypeMatch = rawText.match(/日系|外資/)
  if (companyTypeMatch) {
    result.confidential.target_details.company_type = companyTypeMatch[0]
  }

  // Parse consulting type
  const consultingTypeMatch = rawText.match(/(?:総合|戦略|IT|業務)[ファーム]*/)
  if (consultingTypeMatch) {
    result.confidential.target_details.consulting_type = consultingTypeMatch[0]
  }

  return result
}
