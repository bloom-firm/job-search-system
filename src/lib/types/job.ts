export interface Job {
  id: string
  title: string
  company_name: string
  company_size: string
  industry_category: string
  job_type: string
  employment_type: string
  location: string
  salary_min?: number | null
  salary_max?: number | null
  description: string
  requirements: string
  preferred_skills?: string
  company_culture?: string
  selection_process?: string
  status: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface JobSearchParams {
  keyword?: string
  location?: string
  employment_type?: string
  page?: number
  limit?: number
}