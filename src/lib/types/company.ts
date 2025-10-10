export interface BasicInfo {
  official_name?: string
  founded?: string
  headquarters?: string
  employees?: string
  listing_status?: string
  business_description?: string
  location?: string
  vision?: string
  products?: string
  business_model?: string
  clients?: string
  competitors?: string
}

export interface WorkStyle {
  work_format?: string
  annual_holidays?: string
  benefits?: string
}

export interface SelectionProcess {
  flow?: string
  speed?: string
  key_points?: string
  [key: string]: unknown
}

export interface RecruitmentReality {
  education_requirements?: string
  job_change_limit?: string
  age_preference?: string
  other_criteria?: string[]
  characteristics?: string[]
  [key: string]: unknown
}

export interface InternalMemo {
  company_characteristics?: string[]
  selection_notes?: string[]
  proposal_tips?: string[]
  other_notes?: string[]
  [key: string]: unknown
}

export interface NgItems {
  concurrent_ng_companies?: string[]
  reapplication_rule?: string
  applied_candidates_notes?: string
  other_prohibitions?: string[]
  note?: string
  [key: string]: unknown
}

export interface ApplicationSystem {
  url?: string
  id?: string
  password?: string
  special_notes?: string
  ats?: string
  [key: string]: unknown
}

export interface ContractInfo {
  commission_rate?: string
  refund_policy?: Record<string, string>
  contract_period?: string
  special_terms?: string
  contract_status?: string
  email?: string
  url?: string
  [key: string]: unknown
}

export interface TargetDetails {
  desired_profiles?: string[]
  target_companies?: string[]
  technical_requirements?: string[]
  department_needs?: string[]
  requirements?: string[]
  difficulty?: string
  company_type?: string
  consulting_type?: string
  [key: string]: unknown
}

export interface PublicInfo {
  basic_info: BasicInfo
  work_style: WorkStyle
}

export interface ConfidentialInfo {
  selection_process: SelectionProcess
  recruitment_reality: RecruitmentReality
  internal_memo: InternalMemo
  ng_items: NgItems
  application_system: ApplicationSystem
  contract_info: ContractInfo
  target_details: TargetDetails
}

export interface CompanyData {
  company_name: string
  public: PublicInfo
  confidential: ConfidentialInfo
}

export interface CompanyMaster {
  id: number
  company_name: string
  basic_info?: BasicInfo
  work_style?: WorkStyle
  selection_process?: SelectionProcess
  recruitment_reality?: RecruitmentReality
  internal_memo?: InternalMemo
  contract_info?: ContractInfo
  created_at: string
  updated_at: string
}
