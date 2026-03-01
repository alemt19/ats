export type CandidateCulturalPreferences = Partial<Record<string, string>>

export type Candidate = {
  id: number
  name: string
  lastname: string
  profile_picture?: string
  email: string
  dni: string
  phone?: string
  country?: string
  state?: string
  city?: string
  address?: string
  contact_page?: string
  cv_url?: string
  behavioral_ans_1: string
  behavioral_ans_2: string
  technical_skills: string[]
  soft_skills: string[]
  values: string[]
  cultural_preferences: CandidateCulturalPreferences
}

export type CandidateListItem = {
  id: number
  name: string
  lastname: string
  email: string
  dni: string
}

export type CandidatesQueryParams = {
  search: string
  page: number
  pageSize: number
}

export type CandidatesResponse = {
  items: CandidateListItem[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeCandidatesQuery(
  query?: Partial<Record<keyof CandidatesQueryParams, string | number | undefined>>
): CandidatesQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    search: String(query?.search ?? "").trim(),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize: Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : DEFAULT_PAGE_SIZE,
  }
}
