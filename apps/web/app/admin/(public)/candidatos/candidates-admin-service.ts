import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type Candidate,
  type CandidateListItem,
  type CandidatesQueryParams,
  type CandidatesResponse,
  normalizeCandidatesQuery,
} from "./candidates-admin-types"

type CandidateDummyRecord = {
  id?: unknown
  name?: unknown
  lastname?: unknown
  profile_picture?: unknown
  email?: unknown
  dni?: unknown
  phone?: unknown
  country?: unknown
  state?: unknown
  city?: unknown
  address?: unknown
  contact_page?: unknown
  cv_url?: unknown
  behavioral_ans_1?: unknown
  behavioral_ans_2?: unknown
  technical_skills?: unknown
  soft_skills?: unknown
  values?: unknown
  cultural_preferences?: unknown
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
}

function normalizeCandidate(item: CandidateDummyRecord, fallbackId: number): Candidate {
  const idValue = Number(item.id)

  return {
    id: Number.isFinite(idValue) && idValue > 0 ? idValue : fallbackId,
    name: typeof item.name === "string" ? item.name.trim() : "",
    lastname: typeof item.lastname === "string" ? item.lastname.trim() : "",
    profile_picture: typeof item.profile_picture === "string" ? item.profile_picture.trim() : undefined,
    email: typeof item.email === "string" ? item.email.trim() : "",
    dni: typeof item.dni === "string" ? item.dni.trim() : "",
    phone: typeof item.phone === "string" ? item.phone.trim() : "",
    country: typeof item.country === "string" ? item.country.trim() : "",
    state: typeof item.state === "string" ? item.state.trim() : "",
    city: typeof item.city === "string" ? item.city.trim() : "",
    address: typeof item.address === "string" ? item.address.trim() : "",
    contact_page: typeof item.contact_page === "string" ? item.contact_page.trim() : "",
    cv_url: typeof item.cv_url === "string" ? item.cv_url.trim() : "",
    behavioral_ans_1: typeof item.behavioral_ans_1 === "string" ? item.behavioral_ans_1.trim() : "",
    behavioral_ans_2: typeof item.behavioral_ans_2 === "string" ? item.behavioral_ans_2.trim() : "",
    technical_skills: parseStringArray(item.technical_skills),
    soft_skills: parseStringArray(item.soft_skills),
    values: parseStringArray(item.values),
    cultural_preferences:
      item.cultural_preferences && typeof item.cultural_preferences === "object"
        ? (item.cultural_preferences as Record<string, string>)
        : {},
  }
}

async function getAllCandidates(): Promise<Candidate[]> {
  try {
    const payload = await readJsonFile<CandidateDummyRecord[]>("candidates_admin_dummy.json")

    if (!Array.isArray(payload)) {
      return []
    }

    return payload.map((item, index) => normalizeCandidate(item, index + 1))
  } catch {
    return [
      {
        id: 101,
        name: "Ana",
        lastname: "Pérez",
        profile_picture: "https://i.pravatar.cc/150?img=5",
        email: "ana.perez@email.com",
        dni: "V-22334455",
        phone: "+58 412 123 4567",
        country: "Venezuela",
        state: "Distrito Capital",
        city: "Caracas",
        address: "Av. Libertador",
        contact_page: "https://portfolio.anaperez.dev",
        cv_url: "https://herramientas.datos.gov.co/sites/default/files/2021-08/Pruebas_3.pdf",
        behavioral_ans_1: "Respuesta conductual 1",
        behavioral_ans_2: "Respuesta conductual 2",
        technical_skills: ["React"],
        soft_skills: ["Comunicación"],
        values: ["Responsabilidad"],
        cultural_preferences: {},
      },
    ]
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

function applyFilters(candidates: CandidateListItem[], query: CandidatesQueryParams): CandidatesResponse {
  const normalizedSearch = query.search.toLowerCase()

  const filtered = candidates.filter((candidate) => {
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

export async function getCandidatesServer(
  queryInput?: Partial<Record<keyof CandidatesQueryParams, string | number | undefined>>
): Promise<CandidatesResponse> {
  const query = normalizeCandidatesQuery(queryInput)
  const allCandidates = await getAllCandidates()
  const listItems = allCandidates.map(mapListItem)
  return applyFilters(listItems, query)
}

export async function getCandidateByIdServer(candidateId: number): Promise<Candidate | null> {
  if (!Number.isFinite(candidateId) || candidateId <= 0) {
    return null
  }

  const allCandidates = await getAllCandidates()
  return allCandidates.find((candidate) => candidate.id === candidateId) ?? null
}
