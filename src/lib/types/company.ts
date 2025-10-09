export interface BasicInfo {
  official_name: string
  founded: string
  headquarters: string
  employees: string
  business_description: string
}

export interface WorkStyle {
  work_format: string
  annual_holidays: string
  benefits: string
}

export interface PublicInfo {
  basic_info: BasicInfo
  work_style: WorkStyle
}

export interface ConfidentialInfo {
  selection_process: any
  recruitment_reality: any
  internal_memo: any
  ng_items: any
  application_system: any
  contract_info: any
  target_details: any
}

export interface CompanyData {
  company_name: string
  public: PublicInfo
  confidential: ConfidentialInfo
}
