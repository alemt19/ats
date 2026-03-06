import "server-only"

import {
  type JobOffer,
  type OffersQueryParams,
  type OffersResponse,
  normalizeOffersQuery,
} from "./offers-types"

type BackendOffersResponse =
  | OffersResponse
  | {
      data?: JobOffer[]
      items?: JobOffer[]
      total?: number
      page?: number
      pageSize?: number
    }
  | {
      success?: boolean
      data?:
        | JobOffer[]
        | {
            items?: JobOffer[]
            total?: number
            page?: number
            pageSize?: number
          }
    }
  | JobOffer[]

type OffersWithMetadata = {
  items?: JobOffer[]
  data?: JobOffer[]
  total?: number
  page?: number
  pageSize?: number
}

function toSearchParams(query: OffersQueryParams) {
  const searchParams = new URLSearchParams()

  if (query.title) {
    searchParams.set("title", query.title)
  }

  if (query.category !== "all") {
    searchParams.set("category", query.category)
  }

  if (query.workplace_type !== "all") {
    searchParams.set("workplace_type", query.workplace_type)
  }

  if (query.employment_type !== "all") {
    searchParams.set("employment_type", query.employment_type)
  }

  if (query.city !== "all") {
    searchParams.set("city", query.city)
  }

  searchParams.set("page", String(query.page))
  searchParams.set("pageSize", String(query.pageSize))

  return searchParams
}

function parseBackendResponse(payload: BackendOffersResponse, query: OffersQueryParams): OffersResponse {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    payload.data &&
    !Array.isArray(payload.data)
  ) {
    return parseBackendResponse(payload.data as BackendOffersResponse, query)
  }

  if (Array.isArray(payload)) {
    const total = payload.length
    return {
      items: payload,
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  if ("items" in payload && Array.isArray(payload.items)) {
    const payloadWithMetadata = payload as OffersWithMetadata
    return {
      items: payload.items,
      total: payloadWithMetadata.total ?? payload.items.length,
      page: payloadWithMetadata.page ?? query.page,
      pageSize: payloadWithMetadata.pageSize ?? query.pageSize,
    }
  }

  if ("data" in payload && Array.isArray(payload.data)) {
    const payloadWithMetadata = payload as OffersWithMetadata
    return {
      items: payload.data,
      total: payloadWithMetadata.total ?? payload.data.length,
      page: payloadWithMetadata.page ?? query.page,
      pageSize: payloadWithMetadata.pageSize ?? query.pageSize,
    }
  }

  return {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getOffersServer(queryInput?:
  Partial<Record<keyof OffersQueryParams, string | number | undefined>>
): Promise<OffersResponse> {
  const query = normalizeOffersQuery(queryInput)
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [
    `${apiBaseUrl}/api/jobs?${toSearchParams(query).toString()}`,
    `${apiBaseUrl}/jobs?${toSearchParams(query).toString()}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      })

      if (response.ok) {
        const payload = (await response.json()) as BackendOffersResponse
        return parseBackendResponse(payload, query)
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  throw new Error("No se pudieron cargar las ofertas desde el backend")
}
