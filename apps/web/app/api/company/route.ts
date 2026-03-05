import { NextResponse } from "next/server"

type CompanySummary = {
  name: string
  logo: string
}

type AdminCompanyConfigResponse = {
  initialData?: {
    name?: string
    logo?: string
  }
}

type PublicCompany = {
  name?: string | null
  logo_url?: string | null
}

type ApiEnvelope<T> = {
  data?: T
}

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeLogo(logo: string | null | undefined): string {
  const value = (logo ?? "").trim()

  if (!value) {
    return ""
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value
  }

  if (value.startsWith("/")) {
    return `${backendApiUrl}${value}`
  }

  if (value.startsWith("uploads/")) {
    return `${backendApiUrl}/${value}`
  }

  return value
}

function toCompanySummary(input: { name?: string | null; logo?: string | null }): CompanySummary | null {
  const name = (input.name ?? "").trim()

  if (!name) {
    return null
  }

  return {
    name,
    logo: normalizeLogo(input.logo),
  }
}

async function tryGetAdminCompany(cookie?: string): Promise<CompanySummary | null> {
  const response = await fetch(`${backendApiUrl}/api/admin/company-config`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json().catch(() => null)) as
    | AdminCompanyConfigResponse
    | ApiEnvelope<AdminCompanyConfigResponse>
    | null

  const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload
  const initialData = data?.initialData

  return toCompanySummary({
    name: initialData?.name,
    logo: initialData?.logo,
  })
}

async function tryGetPublicCompany(): Promise<CompanySummary | null> {
  const response = await fetch(`${backendApiUrl}/api/companies?skip=0&take=1`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json().catch(() => null)) as PublicCompany[] | ApiEnvelope<PublicCompany[]> | null
  const companies = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.data)
      ? payload.data
      : []

  const firstCompany = companies[0]

  return toCompanySummary({
    name: firstCompany?.name,
    logo: firstCompany?.logo_url,
  })
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined

  const company = (await tryGetAdminCompany(cookie)) ?? (await tryGetPublicCompany())

  return NextResponse.json({ company })
}
