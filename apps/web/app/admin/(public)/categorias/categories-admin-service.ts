import "server-only"

import {
  type AdminCategoriesQueryParams,
  type AdminCategoriesResponse,
  type AdminCategory,
  normalizeAdminCategoriesQuery,
} from "./categories-admin-types"

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

export async function getAdminCategoriesServer(
  queryInput?: Partial<Record<keyof AdminCategoriesQueryParams, string | number | undefined>>,
  cookie?: string
): Promise<AdminCategoriesResponse> {
  const query = normalizeAdminCategoriesQuery(queryInput)

  const params = new URLSearchParams()
  if (query.name) {
    params.set("name", query.name)
  }
  params.set("page", String(query.page))
  params.set("pageSize", String(query.pageSize))

  const response = await fetch(`${backendApiUrl}/api/admin/categorias?${params.toString()}`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  return parseBackendResponse<AdminCategoriesResponse>(
    response,
    "No se pudieron cargar las categorías"
  )
}

export async function getAdminCategoryByIdServer(
  categoryId: number,
  cookie?: string
): Promise<AdminCategory | null> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return null
  }

  const response = await fetch(`${backendApiUrl}/api/admin/categorias/${categoryId}`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  return parseBackendResponse<AdminCategory>(response, "No se pudo cargar la categoría")
}

export async function createAdminCategoryServer(name: string, cookie?: string): Promise<AdminCategory> {
  const normalizedName = name.trim()

  if (!normalizedName) {
    throw new BackendRequestError("El nombre es requerido", 400)
  }

  const response = await fetch(`${backendApiUrl}/api/admin/categorias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    },
    body: JSON.stringify({ name: normalizedName }),
    cache: "no-store",
  })

  return parseBackendResponse<AdminCategory>(response, "No se pudo crear la categoría")
}

export async function updateAdminCategoryServer(
  categoryId: number,
  name: string,
  cookie?: string
): Promise<AdminCategory> {
  const normalizedName = name.trim()

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new BackendRequestError("Categoría inválida", 400)
  }

  if (!normalizedName) {
    throw new BackendRequestError("El nombre es requerido", 400)
  }

  const response = await fetch(`${backendApiUrl}/api/admin/categorias/${categoryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    },
    body: JSON.stringify({ name: normalizedName }),
    cache: "no-store",
  })

  return parseBackendResponse<AdminCategory>(response, "No se pudo editar la categoría")
}
