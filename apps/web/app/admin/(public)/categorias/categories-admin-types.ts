export type AdminCategory = {
  id: number
  name: string
}

export type AdminCategoriesQueryParams = {
  name: string
  page: number
  pageSize: number
}

export type AdminCategoriesResponse = {
  items: AdminCategory[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeAdminCategoriesQuery(
  query?: Partial<Record<keyof AdminCategoriesQueryParams, string | number | undefined>>
): AdminCategoriesQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    name: String(query?.name ?? "").trim(),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? pageSizeValue
        : DEFAULT_PAGE_SIZE,
  }
}
