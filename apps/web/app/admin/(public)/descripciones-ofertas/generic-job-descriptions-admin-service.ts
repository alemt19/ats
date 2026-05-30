import "server-only"

import {
  type AdminGenericJobDescription,
  type AdminGenericJobDescriptionsQueryParams,
  type AdminGenericJobDescriptionsResponse,
  normalizeAdminGenericJobDescriptionsQuery,
} from "./generic-job-descriptions-admin-types"

type BackendEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
  error?: {
    message?: string | Array<{ message?: string }>
  }
}

export class BackendRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "BackendRequestError"
    this.status = status
  }
}

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

function backendHeaders(cookie?: string): HeadersInit {
  if (!cookie) {
    return {}
  }

  return { cookie }
}

function parseErrorMessage(payload: BackendEnvelope<unknown> | null, fallback: string) {
  const direct = payload?.message
  if (typeof direct === "string" && direct.trim()) {
    return direct
  }

  const nested = payload?.error?.message
  if (typeof nested === "string" && nested.trim()) {
    return nested
  }

  if (Array.isArray(nested) && nested.length > 0) {
    const first = nested[0]?.message
    if (typeof first === "string" && first.trim()) {
      return first
    }
  }

  return fallback
}

async function parseBackendResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | T | null

  if (!response.ok) {
    const message = parseErrorMessage(payload as BackendEnvelope<unknown> | null, fallbackMessage)
    throw new BackendRequestError(message, response.status)
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as BackendEnvelope<T>).data as T
  }

  return payload as T
}

export async function getAdminGenericJobDescriptionsServer(
  queryInput?: Partial<Record<keyof AdminGenericJobDescriptionsQueryParams, string | number | undefined>>,
  cookie?: string
): Promise<AdminGenericJobDescriptionsResponse> {
  const query = normalizeAdminGenericJobDescriptionsQuery(queryInput)

  const params = new URLSearchParams()
  if (query.search) {
    params.set("search", query.search)
  }
  params.set("page", String(query.page))
  params.set("pageSize", String(query.pageSize))

  const response = await fetch(`${backendApiUrl}/api/admin/descripciones-ofertas?${params.toString()}`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  return parseBackendResponse<AdminGenericJobDescriptionsResponse>(
    response,
    "No se pudieron cargar los puestos predefinidos"
  )
}

export async function getAdminGenericJobDescriptionByIdServer(
  descriptionId: number,
  cookie?: string
): Promise<AdminGenericJobDescription | null> {
  if (!Number.isFinite(descriptionId) || descriptionId <= 0) {
    return null
  }

  const response = await fetch(`${backendApiUrl}/api/admin/descripciones-ofertas/${descriptionId}`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  return parseBackendResponse<AdminGenericJobDescription>(
    response,
    "No se pudo cargar la descripción de oferta"
  )
}

export async function createAdminGenericJobDescriptionServer(
  payload: { position: string; description: string },
  cookie?: string
): Promise<AdminGenericJobDescription> {
  const response = await fetch(`${backendApiUrl}/api/admin/descripciones-ofertas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  return parseBackendResponse<AdminGenericJobDescription>(
    response,
    "No se pudo crear la descripción de oferta"
  )
}

export async function updateAdminGenericJobDescriptionServer(
  descriptionId: number,
  payload: { position: string; description: string },
  cookie?: string
): Promise<AdminGenericJobDescription> {
  const response = await fetch(`${backendApiUrl}/api/admin/descripciones-ofertas/${descriptionId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  return parseBackendResponse<AdminGenericJobDescription>(
    response,
    "No se pudo editar la descripción de oferta"
  )
}