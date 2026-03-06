import "server-only"

import {
  type AdminOffer,
  type AdminOffersCatalogsResponse,
  type AdminOffersQueryParams,
  type AdminOffersResponse,
  normalizeAdminOffersQuery,
} from "./offers-admin-types"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

type BackendEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
}

function backendHeaders(cookie?: string): HeadersInit {
  if (!cookie) {
    return {}
  }

  return { cookie }
}

async function parseBackendResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | T | null

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : fallbackMessage

    throw new Error(message)
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as BackendEnvelope<T>).data as T
  }

  return payload as T
}

export async function getAdminOffersServer(
  queryInput?: Partial<Record<keyof AdminOffersQueryParams, string | number | undefined>>,
  cookie?: string
): Promise<AdminOffersResponse> {
  const query = normalizeAdminOffersQuery(queryInput)

  const params = new URLSearchParams()
  if (query.title) params.set("title", query.title)
  if (query.category !== "all") params.set("category", query.category)
  if (query.workplace_type !== "all") params.set("workplace_type", query.workplace_type)
  if (query.employment_type !== "all") params.set("employment_type", query.employment_type)
  if (query.city !== "all") params.set("city", query.city)
  if (query.state !== "all") params.set("state", query.state)
  if (query.status !== "all") params.set("status", query.status)
  params.set("page", String(query.page))
  params.set("pageSize", String(query.pageSize))

  const response = await fetch(`${backendApiUrl}/api/admin/ofertas?${params.toString()}`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  return await parseBackendResponse<AdminOffersResponse>(response, "No se pudieron cargar las ofertas")
}

export async function getAdminOffersCatalogsServer(cookie?: string): Promise<AdminOffersCatalogsResponse> {
  const response = await fetch(`${backendApiUrl}/api/admin/ofertas/catalogs`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  return await parseBackendResponse<AdminOffersCatalogsResponse>(
    response,
    "No se pudieron cargar los catalogos"
  )
}
