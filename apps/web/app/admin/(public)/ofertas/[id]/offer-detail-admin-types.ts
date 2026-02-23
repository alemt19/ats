export type JobParameterOption = {
  technical_name: string
  display_name: string
}

export type AdminOfferDetail = {
  id: number
  title: string
  description: string
  status: string
  city: string
  state: string
  address: string
  workplace_type: string
  employment_type: string
  position: string
  salary: number
  weight_technical: number
  weight_soft: number
  weight_culture: number
  category: string
  technical_skills: string[]
  soft_skills: string[]
  published_at: string
  candidates_count: number
}

export type CandidateStatusOption = {
  technical_name: string
  display_name: string
}

export type AdminOfferCandidate = {
  application_id: string
  candidate_id: string
  first_name: string
  last_name: string
  technical_score: number
  soft_score: number
  culture_score: number
  status: string
}

export type AdminOfferCandidatesQueryParams = {
  search: string
  technical_min: number
  technical_max: number
  soft_min: number
  soft_max: number
  culture_min: number
  culture_max: number
  status: string
  page: number
  pageSize: number
}

export type AdminOfferCandidatesResponse = {
  items: AdminOfferCandidate[]
  total: number
  page: number
  pageSize: number
}

export type AdminOfferDetailResponse = {
  offer: AdminOfferDetail
  status_display_name: string
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 8

export function normalizeAdminOfferCandidatesQuery(
  query?: Partial<Record<keyof AdminOfferCandidatesQueryParams, string | number | undefined>>
): AdminOfferCandidatesQueryParams {
  const toNumber = (value: string | number | undefined, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const technicalMin = Math.max(0, Math.min(100, toNumber(query?.technical_min, 0)))
  const technicalMax = Math.max(0, Math.min(100, toNumber(query?.technical_max, 100)))
  const softMin = Math.max(0, Math.min(100, toNumber(query?.soft_min, 0)))
  const softMax = Math.max(0, Math.min(100, toNumber(query?.soft_max, 100)))
  const cultureMin = Math.max(0, Math.min(100, toNumber(query?.culture_min, 0)))
  const cultureMax = Math.max(0, Math.min(100, toNumber(query?.culture_max, 100)))

  const pageValue = toNumber(query?.page, DEFAULT_PAGE)
  const pageSizeValue = toNumber(query?.pageSize, DEFAULT_PAGE_SIZE)

  return {
    search: String(query?.search ?? "").trim(),
    technical_min: Math.min(technicalMin, technicalMax),
    technical_max: Math.max(technicalMin, technicalMax),
    soft_min: Math.min(softMin, softMax),
    soft_max: Math.max(softMin, softMax),
    culture_min: Math.min(cultureMin, cultureMax),
    culture_max: Math.max(cultureMin, cultureMax),
    status: String(query?.status ?? "all").trim() || "all",
    page: pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize: pageSizeValue > 0 ? pageSizeValue : DEFAULT_PAGE_SIZE,
  }
}
