export type WorkplaceType = "remote" | "onsite" | "hybrid"
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship"

export type JobOffer = {
  id: number
  title: string
  category: string
  city: string
  state: string
  position: string
  salary: number
  workplace_type: WorkplaceType
  employment_type: EmploymentType
}

export type OffersQueryParams = {
  title: string
  category: string
  workplace_type: string
  employment_type: string
  city: string
  page: number
  pageSize: number
}

export type OffersResponse = {
  items: JobOffer[]
  total: number
  page: number
  pageSize: number
}

export type OffersCatalogsResponse = {
  categories: string[]
  cities: string[]
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeOffersQuery(
  query?: Partial<Record<keyof OffersQueryParams, string | number | undefined>>
): OffersQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    title: String(query?.title ?? "").trim(),
    category: String(query?.category ?? "all").trim() || "all",
    workplace_type: String(query?.workplace_type ?? "all").trim() || "all",
    employment_type: String(query?.employment_type ?? "all").trim() || "all",
    city: String(query?.city ?? "all").trim() || "all",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? pageSizeValue
        : DEFAULT_PAGE_SIZE,
  }
}
