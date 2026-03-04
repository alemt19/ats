import "server-only"

type PreferenceFieldName =
  | "dress_code"
  | "colaboration_style"
  | "work_pace"
  | "level_of_autonomy"
  | "dealing_with_management"
  | "level_of_monitoring"

type AdminCompanyConfigInitialData = {
  name: string
  logo: string
  contact_email: string
  country: string
  state: string
  city: string
  address: string
  description: string
  mision: string
  values: string[]
  preferences: Partial<Record<PreferenceFieldName, string>>
}

type CompanyConfigBootstrapData = {
  initialData: AdminCompanyConfigInitialData
  companyValueOptions: string[]
}

type BackendEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
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

async function parseBackendResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as BackendEnvelope<T> | T | null

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "No se pudo completar la operación de configuración de empresa"

    throw new BackendRequestError(message, response.status)
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as BackendEnvelope<T>).data as T
  }

  return payload as T
}

export async function getCompanyConfigServer(cookie?: string): Promise<CompanyConfigBootstrapData> {
  const response = await fetch(`${backendApiUrl}/api/admin/company-config`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  return parseBackendResponse<CompanyConfigBootstrapData>(response)
}

export async function updateCompanyConfigServer(payload: FormData | Record<string, unknown>, cookie?: string) {
  const body = payload instanceof FormData ? payload : JSON.stringify(payload)
  const headers: HeadersInit = payload instanceof FormData
    ? backendHeaders(cookie)
    : {
        "Content-Type": "application/json",
        ...backendHeaders(cookie),
      }

  const response = await fetch(`${backendApiUrl}/api/admin/company-config`, {
    method: "PUT",
    headers,
    body,
    cache: "no-store",
  })

  return parseBackendResponse<CompanyConfigBootstrapData>(response)
}
