export type RecruiterRoleOption = {
  technical_name: string
  display_name: string
}

export type RecruiterStateOption = {
  name: string
  cities: string[]
}

export type RecruitersCatalogsResponse = {
  country: string
  country_phone_prefix: string
  roles: RecruiterRoleOption[]
  states: RecruiterStateOption[]
}

export type Recruiter = {
  id: number
  profile_picture: string
  name: string
  lastname: string
  email: string
  password: string
  dni: string
  phone: string
  role: string
  country: string
  state: string
  city: string
  address: string
}

export type RecruitersQueryParams = {
  search: string
  page: number
  pageSize: number
}

export type RecruitersResponse = {
  items: Recruiter[]
  total: number
  page: number
  pageSize: number
}

export type RecruiterPayload = {
  profile_picture?: string
  name: string
  lastname: string
  email: string
  password: string
  dni: string
  phone: string
  phone_prefix?: string
  role: string
  country?: string
  state: string
  city: string
  address: string
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeRecruitersQuery(
  query?: Partial<Record<keyof RecruitersQueryParams, string | number | undefined>>
): RecruitersQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    search: String(query?.search ?? "").trim(),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize: Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : DEFAULT_PAGE_SIZE,
  }
}
