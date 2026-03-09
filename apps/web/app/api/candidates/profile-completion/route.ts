import { headers } from "next/headers"
import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CandidateProfile = {
  name?: string | null
  lastname?: string | null
  birth_date?: string | null
  state?: string | null
  city?: string | null
  phone?: string | null
  dni?: string | null
  dress_code?: string | null
  collaboration_style?: string | null
  work_pace?: string | null
  level_of_autonomy?: string | null
  dealing_with_management?: string | null
  level_of_monitoring?: string | null
}

type CompetenciasValores = {
  initialData?: {
    cv_url?: string
    behavioral_ans_1?: string
    behavioral_ans_2?: string
    technical_skills?: string[]
    soft_skills?: string[]
    values?: string[]
  }
}

type Envelope<T> = {
  success?: boolean
  data?: T
  message?: string
}

function unwrapEnvelope<T>(payload: T | Envelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data
  }

  return payload as T
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function pickMissingFields(
  profile: CandidateProfile,
  competenciasValores: CompetenciasValores
): string[] {
  const missing: string[] = []

  if (!hasText(profile.name)) missing.push("nombre")
  if (!hasText(profile.lastname)) missing.push("apellido")
  if (!hasText(profile.birth_date)) missing.push("fecha de nacimiento")
  if (!hasText(profile.state)) missing.push("estado")
  if (!hasText(profile.city)) missing.push("ciudad")
  if (!hasText(profile.phone)) missing.push("telefono")
  if (!hasText(profile.dni)) missing.push("dni")

  const initialData = competenciasValores.initialData ?? {}

  if (!hasText(initialData.cv_url)) missing.push("cv")
  if (!hasText(initialData.behavioral_ans_1)) missing.push("respuesta conductual 1")
  if (!hasText(initialData.behavioral_ans_2)) missing.push("respuesta conductual 2")
  if (!hasItems(initialData.technical_skills)) missing.push("habilidades tecnicas")
  if (!hasItems(initialData.soft_skills)) missing.push("habilidades blandas")
  if (!hasItems(initialData.values)) missing.push("valores")

  if (!hasText(profile.dress_code)) missing.push("dress_code")
  if (!hasText(profile.collaboration_style)) missing.push("collaboration_style")
  if (!hasText(profile.work_pace)) missing.push("work_pace")
  if (!hasText(profile.level_of_autonomy)) missing.push("level_of_autonomy")
  if (!hasText(profile.dealing_with_management)) missing.push("dealing_with_management")
  if (!hasText(profile.level_of_monitoring)) missing.push("level_of_monitoring")

  return missing
}

async function fetchCandidateProfile(cookieHeader: string) {
  const endpoints = [`${backendApiUrl}/api/candidates/me`]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
        cache: "no-store",
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { unauthorized: true as const, payload: null }
        }

        continue
      }

      const payload = (await response.json()) as CandidateProfile | Envelope<CandidateProfile>
      return { unauthorized: false as const, payload: unwrapEnvelope(payload) }
    } catch {
      // Try next endpoint variant.
    }
  }

  return { unauthorized: false as const, payload: null }
}

async function fetchCompetenciasValores(cookieHeader: string) {
  const endpoints = [`${backendApiUrl}/api/candidates/me/competencias-valores`]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
        cache: "no-store",
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { unauthorized: true as const, payload: null }
        }

        continue
      }

      const payload = (await response.json()) as
        | CompetenciasValores
        | Envelope<CompetenciasValores>

      return { unauthorized: false as const, payload: unwrapEnvelope(payload) }
    } catch {
      // Try next endpoint variant.
    }
  }

  return { unauthorized: false as const, payload: null }
}

export async function GET() {
  const requestHeaders = await headers()
  const cookieHeader = requestHeaders.get("cookie") ?? ""

  if (!cookieHeader) {
    return NextResponse.json(
      { message: "Debes iniciar sesion como candidato", missingFields: [] },
      { status: 401 }
    )
  }

  const [profileResponse, competenciasResponse] = await Promise.all([
    fetchCandidateProfile(cookieHeader),
    fetchCompetenciasValores(cookieHeader),
  ])

  if (profileResponse.unauthorized || competenciasResponse.unauthorized) {
    return NextResponse.json(
      { message: "Debes iniciar sesion como candidato", missingFields: [] },
      { status: 401 }
    )
  }

  if (!profileResponse.payload || !competenciasResponse.payload) {
    return NextResponse.json(
      { message: "No se pudo validar el perfil de candidato", missingFields: [] },
      { status: 502 }
    )
  }

  const missingFields = pickMissingFields(profileResponse.payload, competenciasResponse.payload)

  return NextResponse.json({
    isComplete: missingFields.length === 0,
    missingFields,
  })
}
