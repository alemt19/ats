export type AdminGenericJobDescription = {
  id: number
  position: string
  description: string
}

export type AdminGenericJobDescriptionsQueryParams = {
  search: string
  page: number
  pageSize: number
}

export type AdminGenericJobDescriptionsResponse = {
  items: AdminGenericJobDescription[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

export function normalizeAdminGenericJobDescriptionsQuery(
  query?: Partial<Record<keyof AdminGenericJobDescriptionsQueryParams, string | number | undefined>>
): AdminGenericJobDescriptionsQueryParams {
  const pageValue = Number(query?.page)
  const pageSizeValue = Number(query?.pageSize)

  return {
    search: String(query?.search ?? "").trim(),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : DEFAULT_PAGE,
    pageSize: Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : DEFAULT_PAGE_SIZE,
  }
}