import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type AdminOfferCandidate,
  type AdminOfferCandidatesQueryParams,
  type AdminOfferCandidatesResponse,
  type AdminOfferDetail,
  type CandidateStatusOption,
  type JobParameterOption,
  normalizeAdminOfferCandidatesQuery,
} from "./offer-detail-admin-types"

type JobParameterCatalog = {
  technical_name: string
  display_name: string
  values: JobParameterOption[]
}

type JobOfferDummy = {
  id: number
  title: string
  category: string
  city: string
  state: string
  workplace_type: string
  employment_type: string
  salary: number
  position: string
}

type ApplicationStatusItem = {
  technical_name?: string
  techical_name?: string
  display_name: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function formatStatusDisplayName(status: string, parameters: JobParameterCatalog[]) {
  const statusParameter = parameters.find((item) => item.technical_name === "status")
  return (
    statusParameter?.values.find((value) => value.technical_name === status)?.display_name ??
    status
  )
}

function buildPublishedAtById(offerId: number) {
  const date = new Date("2026-01-20T00:00:00.000Z")
  date.setDate(date.getDate() - (offerId % 12) * 3)
  return date.toISOString()
}

function buildAdminOfferDetail(dummy: JobOfferDummy): AdminOfferDetail {
  const statuses = ["published", "draft", "closed", "archived"]

  return {
    id: dummy.id,
    title: dummy.title,
    description:
      "Buscamos una persona con capacidad de análisis, colaboración con equipos multidisciplinarios y enfoque en resultados medibles para el negocio.",
    status: statuses[dummy.id % statuses.length] ?? "draft",
    city: dummy.city,
    state: dummy.state,
    address: "Av. Principal, Torre Empresarial, Piso 4",
    workplace_type: dummy.workplace_type,
    employment_type: dummy.employment_type,
    position: dummy.position,
    salary: Number(dummy.salary ?? 0),
    weight_technical: 0.5,
    weight_soft: 0.3,
    weight_culture: 0.2,
    category: dummy.category,
    technical_skills: ["SQL", "Python", "Power BI"],
    soft_skills: ["Comunicación", "Pensamiento crítico"],
    published_at: buildPublishedAtById(dummy.id),
    candidates_count: 35,
  }
}

function buildCandidatesBase(offerId: number): AdminOfferCandidate[] {
  const people = [
    ["Carlos", "Pérez"],
    ["María", "González"],
    ["José", "Hernández"],
    ["Luisa", "Martínez"],
    ["Ana", "Rodríguez"],
    ["Miguel", "Díaz"],
    ["Sofía", "Rojas"],
    ["Pedro", "López"],
    ["Elena", "Castro"],
    ["Raúl", "Mendoza"],
    ["Carla", "Silva"],
    ["Diego", "Morales"],
    ["Valentina", "Torres"],
    ["Ricardo", "Vera"],
    ["Paula", "Ramírez"],
    ["Andrés", "Salas"],
  ] as const

  const statuses = ["applied", "contacted", "rejected", "hired"]

  return people.map((person, index) => {
    const technicalScore = 45 + ((offerId * 11 + index * 13) % 50)
    const softScore = 40 + ((offerId * 7 + index * 17) % 55)
    const cultureScore = 35 + ((offerId * 5 + index * 19) % 60)

    return {
      application_id: `app_${offerId}_${index + 1}`,
      candidate_id: `cand_${offerId}_${index + 1}`,
      first_name: person[0],
      last_name: person[1],
      technical_score: Math.min(100, technicalScore),
      soft_score: Math.min(100, softScore),
      culture_score: Math.min(100, cultureScore),
      status: statuses[index % statuses.length] ?? "applied",
    }
  })
}

function remapCandidatesForRefresh(candidates: AdminOfferCandidate[]) {
  return candidates.map((candidate, index) => ({
    ...candidate,
    technical_score: Math.max(0, Math.min(100, candidate.technical_score + (index % 2 === 0 ? 4 : -3))),
    soft_score: Math.max(0, Math.min(100, candidate.soft_score + (index % 3 === 0 ? 5 : -2))),
    culture_score: Math.max(0, Math.min(100, candidate.culture_score + (index % 4 === 0 ? 3 : -1))),
  }))
}

function applyCandidateFilters(
  candidates: AdminOfferCandidate[],
  query: AdminOfferCandidatesQueryParams
): AdminOfferCandidatesResponse {
  const normalizedSearch = query.search.toLowerCase()

  const filtered = candidates.filter((candidate) => {
    const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase()

    const searchMatch = normalizedSearch ? fullName.includes(normalizedSearch) : true
    const technicalMatch =
      candidate.technical_score >= query.technical_min &&
      candidate.technical_score <= query.technical_max
    const softMatch = candidate.soft_score >= query.soft_min && candidate.soft_score <= query.soft_max
    const cultureMatch =
      candidate.culture_score >= query.culture_min &&
      candidate.culture_score <= query.culture_max
    const statusMatch = query.status === "all" ? true : candidate.status === query.status

    return searchMatch && technicalMatch && softMatch && cultureMatch && statusMatch
  })

  const total = filtered.length
  const start = (query.page - 1) * query.pageSize
  const items = filtered.slice(start, start + query.pageSize)

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getApplicationStatusOptionsServer(): Promise<CandidateStatusOption[]> {
  try {
    const items = await readJsonFile<ApplicationStatusItem[]>("application_status.json")

    return items
      .map((item) => ({
        technical_name: item.technical_name ?? item.techical_name ?? "",
        display_name: item.display_name,
      }))
      .filter((item) => item.technical_name.length > 0)
  } catch {
    return [
      { technical_name: "applied", display_name: "Postulado" },
      { technical_name: "contacted", display_name: "Contactado" },
      { technical_name: "rejected", display_name: "Rechazado" },
      { technical_name: "hired", display_name: "Contratado" },
    ]
  }
}

export async function getAdminOfferDetailServer(offerId: number) {
  try {
    const [jobOffers, parameters] = await Promise.all([
      readJsonFile<JobOfferDummy[]>("job_offers_dummy.json"),
      readJsonFile<JobParameterCatalog[]>("job_parameters.json"),
    ])

    const selectedOffer = jobOffers.find((offer) => offer.id === offerId)

    if (!selectedOffer) {
      return null
    }

    const offer = buildAdminOfferDetail(selectedOffer)

    return {
      offer,
      status_display_name: formatStatusDisplayName(offer.status, parameters),
    }
  } catch {
    if (offerId !== 1) {
      return null
    }

    const fallbackOffer: AdminOfferDetail = {
      id: 1,
      title: "Analista de Datos",
      description:
        "Persona con experiencia en análisis de datos para apoyar decisiones de negocio con enfoque en métricas y visualizaciones.",
      status: "published",
      city: "Valencia",
      state: "Carabobo",
      address: "Av. Bolívar Norte, Torre 5",
      workplace_type: "hybrid",
      employment_type: "full_time",
      position: "Semi Senior",
      salary: 1800,
      weight_technical: 0.5,
      weight_soft: 0.3,
      weight_culture: 0.2,
      category: "Tecnología",
      technical_skills: ["SQL", "Python", "Power BI"],
      soft_skills: ["Comunicación", "Pensamiento crítico"],
      published_at: "2026-02-20T00:00:00.000Z",
      candidates_count: 35,
    }

    return {
      offer: fallbackOffer,
      status_display_name: "Publicado",
    }
  }
}

export async function getAdminOfferCandidatesServer(
  offerId: number,
  queryInput?: Partial<Record<keyof AdminOfferCandidatesQueryParams, string | number | undefined>>
) {
  const query = normalizeAdminOfferCandidatesQuery(queryInput)

  await new Promise((resolve) => setTimeout(resolve, 350))
  const candidates = buildCandidatesBase(offerId)
  return applyCandidateFilters(candidates, query)
}

export async function refreshAdminOfferCandidatesServer(
  offerId: number,
  queryInput?: Partial<Record<keyof AdminOfferCandidatesQueryParams, string | number | undefined>>
) {
  const query = normalizeAdminOfferCandidatesQuery(queryInput)

  await new Promise((resolve) => setTimeout(resolve, 1000))
  const refreshedCandidates = remapCandidatesForRefresh(buildCandidatesBase(offerId))
  return applyCandidateFilters(refreshedCandidates, query)
}
