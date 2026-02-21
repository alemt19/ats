export type JobParameterOption = {
  technical_name: string
  display_name: string
}

export type AdminOfferStatus = "draft" | "published" | "closed" | "archived"

export type AdminOffer = {
  id: number
  title: string
  company: string
  category: string
  city: string
  state: string
  candidateCount: number
  createdAt: string
  status: AdminOfferStatus
  workplace_type: string
  employment_type: string
}

export type AdminOffersQueryParams = {
  title: string
  category: string
  workplace_type: string
  employment_type: string
  city: string
  state: string
  status: string
  page: number
  pageSize: number
}

export type AdminOffersResponse = {
  items: AdminOffer[]
  total: number
  page: number
  pageSize: number
}

export type AdminOffersCatalogsResponse = {
  categories: string[]
  cities: string[]
  states: string[]
  workplace_types: JobParameterOption[]
  employment_types: JobParameterOption[]
  statuses: JobParameterOption[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeAdminOffersQuery(
  query?: Partial<Record<keyof AdminOffersQueryParams, string | number | undefined>>
): AdminOffersQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    title: String(query?.title ?? "").trim(),
    category: String(query?.category ?? "all").trim() || "all",
    workplace_type: String(query?.workplace_type ?? "all").trim() || "all",
    employment_type: String(query?.employment_type ?? "all").trim() || "all",
    city: String(query?.city ?? "all").trim() || "all",
    state: String(query?.state ?? "all").trim() || "all",
    status: String(query?.status ?? "all").trim() || "all",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? pageSizeValue
        : DEFAULT_PAGE_SIZE,
  }
}
