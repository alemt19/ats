import "server-only"

import {
  type CandidateApplication,
  type Candidate,
  type CandidateProfileFilter,
  type CandidateListItem,
  type CandidatesQueryParams,
  type CandidatesResponse,
  normalizeCandidatesQuery,
} from "./candidates-admin-types"

type BackendEnvelope<T> = {
  success?: boolean
  timestamp?: string
  data?: T
  message?: string
}

type CandidateAttribute = {
  global_attributes?: {
    name?: string | null
    type?: "hard_skill" | "soft_skill" | "value" | null
  } | null
}

type BackendCandidateRecord = {
  id?: number
  name?: string | null
  lastname?: string | null
  profile_picture?: string | null
  email?: string | null
  dni?: string | null
  phone?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address?: string | null
  contact_page?: string | null
  cv_file_url?: string | null
  behavioral_ans_1?: string | null
  behavioral_ans_2?: string | null
  dress_code?: string | null
  collaboration_style?: string | null
  work_pace?: string | null
  level_of_autonomy?: string | null
  dealing_with_management?: string | null
  level_of_monitoring?: string | null
  user?: {
    email?: string | null
  } | null
  candidate_attributes?: CandidateAttribute[]
}

type BackendCandidateApplicationRecord = {
  application_id?: number
  offer_id?: number
  candidate_id?: number
  offer_title?: string | null
  status?: string | null
  created_at?: string | null
}

function unwrapEnvelope<T>(payload: T | BackendEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data
  }

  return payload as T
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function mapAttributeNames(
  attributes: CandidateAttribute[] | undefined,
  expectedType: "hard_skill" | "soft_skill" | "value"
) {
  return (attributes ?? [])
    .map((item) => item.global_attributes)
    .filter((attribute) => Boolean(attribute?.name && attribute.type === expectedType))
    .map((attribute) => safeText(attribute?.name))
    .filter((entry) => entry.length > 0)
    .sort((a, b) => a.localeCompare(b, "es"))
}

function mapCandidate(record: BackendCandidateRecord): Candidate {
  const technicalSkills = mapAttributeNames(record.candidate_attributes, "hard_skill")
  const softSkills = mapAttributeNames(record.candidate_attributes, "soft_skill")
  const values = mapAttributeNames(record.candidate_attributes, "value")

  const culturalPreferences: Record<string, string> = {}
  const cultureKeys = [
    "dress_code",
    "collaboration_style",
    "work_pace",
    "level_of_autonomy",
    "dealing_with_management",
    "level_of_monitoring",
  ] as const

  for (const key of cultureKeys) {
    const value = safeText(record[key])
    if (value) {
      culturalPreferences[key] = value
    }
  }

  return {
    id: Number(record.id ?? 0),
    name: safeText(record.name),
    lastname: safeText(record.lastname),
    profile_picture: safeText(record.profile_picture) || undefined,
    email: safeText(record.user?.email) || safeText(record.email),
    dni: safeText(record.dni),
    phone: safeText(record.phone) || undefined,
    country: safeText(record.country) || undefined,
    state: safeText(record.state) || undefined,
    city: safeText(record.city) || undefined,
    address: safeText(record.address) || undefined,
    contact_page: safeText(record.contact_page) || undefined,
    cv_url: safeText(record.cv_file_url) || undefined,
    behavioral_ans_1: safeText(record.behavioral_ans_1),
    behavioral_ans_2: safeText(record.behavioral_ans_2),
    technical_skills: technicalSkills,
    soft_skills: softSkills,
    values,
    cultural_preferences: culturalPreferences,
  }
}

function mapListItem(candidate: Candidate): CandidateListItem {
  return {
    id: candidate.id,
    name: candidate.name,
    lastname: candidate.lastname,
    email: candidate.email,
    dni: candidate.dni,
  }
}

function applyFilters(
  candidates: CandidateListItem[],
  query: CandidatesQueryParams,
  hiredCandidateIds: Set<number>
): CandidatesResponse {
  const normalizedSearch = query.search.toLowerCase()

  const filtered = candidates.filter((candidate) => {
    const isHired = hiredCandidateIds.has(candidate.id)

    if (query.profile === "hired" && !isHired) {
      return false
    }

    if (query.profile === "normal" && isHired) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const fullName = `${candidate.name} ${candidate.lastname}`.toLowerCase()

    return (
      fullName.includes(normalizedSearch) ||
      candidate.email.toLowerCase().includes(normalizedSearch) ||
      candidate.dni.toLowerCase().includes(normalizedSearch)
    )
  })

  const total = filtered.length
  const start = (query.page - 1) * query.pageSize

  return {
    items: filtered.slice(start, start + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

async function fetchHiredCandidateIdsFromBackend(): Promise<Set<number>> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [`${apiBaseUrl}/api/applications`, `${apiBaseUrl}/applications`]
  const take = 100

  for (const baseEndpoint of endpoints) {
    try {
      const hiredIds = new Set<number>()
      let skip = 0

      while (true) {
        const pageEndpoint = `${baseEndpoint}?skip=${skip}&take=${take}`
        const response = await fetch(pageEndpoint, {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          hiredIds.clear()
          break
        }

        const payload = (await response.json()) as
          | BackendCandidateApplicationRecord[]
          | BackendEnvelope<BackendCandidateApplicationRecord[]>

        const records = unwrapEnvelope(payload)

        if (!Array.isArray(records)) {
          hiredIds.clear()
          break
        }

        records.forEach((record) => {
          const candidateId = Number(record.candidate_id ?? 0)
          const status = safeText(record.status).toLowerCase()

          if (candidateId > 0 && status === "hired") {
            hiredIds.add(candidateId)
          }
        })

        if (records.length < take) {
          return hiredIds
        }

        skip += take
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  return new Set<number>()
}

async function fetchCandidatesFromBackend(): Promise<Candidate[]> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [`${apiBaseUrl}/api/candidates`, `${apiBaseUrl}/candidates`]
  const take = 100

  for (const baseEndpoint of endpoints) {
    try {
      let skip = 0
      const allRecords: BackendCandidateRecord[] = []

      while (true) {
        const pageEndpoint = `${baseEndpoint}?skip=${skip}&take=${take}`
        const response = await fetch(pageEndpoint, {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          allRecords.length = 0
          break
        }

        const payload = (await response.json()) as
          | BackendCandidateRecord[]
          | BackendEnvelope<BackendCandidateRecord[]>

        const records = unwrapEnvelope(payload)

        if (!Array.isArray(records)) {
          allRecords.length = 0
          break
        }

        allRecords.push(...records)

        if (records.length < take) {
          return allRecords.map(mapCandidate).filter((candidate) => candidate.id > 0)
        }

        skip += take
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  throw new Error("No se pudieron cargar los candidatos desde el backend")
}

async function fetchCandidateByIdFromBackend(candidateId: number): Promise<Candidate | null> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [
    `${apiBaseUrl}/api/candidates/${candidateId}`,
    `${apiBaseUrl}/candidates/${candidateId}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }

        continue
      }

      const payload = (await response.json()) as
        | BackendCandidateRecord
        | BackendEnvelope<BackendCandidateRecord>

      const record = unwrapEnvelope(payload)
      return mapCandidate(record)
    } catch {
      // Try next endpoint variant.
    }
  }

  throw new Error("No se pudo cargar el candidato desde el backend")
}

export async function getCandidatesServer(
  queryInput?: Partial<Record<keyof CandidatesQueryParams, string | number | undefined>>
): Promise<CandidatesResponse> {
  const query = normalizeCandidatesQuery(queryInput)
  const [allCandidates, hiredCandidateIds] = await Promise.all([
    fetchCandidatesFromBackend(),
    fetchHiredCandidateIdsFromBackend(),
  ])
  const listItems = allCandidates.map(mapListItem)
  return applyFilters(listItems, query, hiredCandidateIds)
}

export async function getCandidateByIdServer(candidateId: number): Promise<Candidate | null> {
  if (!Number.isFinite(candidateId) || candidateId <= 0) {
    return null
  }

  return fetchCandidateByIdFromBackend(candidateId)
}

export async function getCandidateApplicationsByIdServer(
  candidateId: number
): Promise<CandidateApplication[]> {
  if (!Number.isFinite(candidateId) || candidateId <= 0) {
    return []
  }

  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [
    `${apiBaseUrl}/api/candidates/${candidateId}/applications`,
    `${apiBaseUrl}/candidates/${candidateId}/applications`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        if (response.status === 404) {
          return []
        }

        continue
      }

      const payload = (await response.json()) as
        | BackendCandidateApplicationRecord[]
        | BackendEnvelope<BackendCandidateApplicationRecord[]>

      const records = unwrapEnvelope(payload)

      if (!Array.isArray(records)) {
        return []
      }

      return records
        .map((record) => ({
          application_id: Number(record.application_id ?? 0),
          offer_id: Number(record.offer_id ?? 0),
          offer_title: safeText(record.offer_title) || "Oferta sin título",
          status: safeText(record.status) || "applied",
          created_at: typeof record.created_at === "string" ? record.created_at : null,
        }))
        .filter((record) => record.application_id > 0 && record.offer_id > 0)
    } catch {
      // Try next endpoint variant.
    }
  }

  return []
}
