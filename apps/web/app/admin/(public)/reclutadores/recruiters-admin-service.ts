import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type Recruiter,
  type RecruiterPayload,
  type RecruitersCatalogsResponse,
  type RecruitersQueryParams,
  type RecruitersResponse,
  normalizeRecruitersQuery,
} from "./recruiters-admin-types"

type RecruiterDummyRecord = {
  id?: unknown
  name?: unknown
  lastname?: unknown
  email?: unknown
  password?: unknown
  dni?: unknown
  phone?: unknown
  role?: unknown
  country?: unknown
  state?: unknown
  city?: unknown
  address?: unknown
}

type RecruiterRoleDummy = {
  technical_name?: unknown
  display_name?: unknown
}

type CountryRecord = {
  id?: unknown
  name?: unknown
}

type StateRecord = {
  id?: unknown
  name?: unknown
  country_id?: unknown
}

type CityRecord = {
  name?: unknown
  state_id?: unknown
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function normalizeRecruiter(record: RecruiterDummyRecord, fallbackId: number, fallbackCountry: string): Recruiter {
  const name = typeof record.name === "string" ? record.name.trim() : ""
  const lastname = typeof record.lastname === "string" ? record.lastname.trim() : ""
  const email = typeof record.email === "string" ? record.email.trim() : ""
  const password = typeof record.password === "string" ? record.password.trim() : ""
  const dni = typeof record.dni === "string" ? record.dni.trim() : ""
  const phone = typeof record.phone === "string" ? record.phone.trim() : ""
  const role = typeof record.role === "string" ? record.role.trim() : "recruiter"
  const state = typeof record.state === "string" ? record.state.trim() : ""
  const city = typeof record.city === "string" ? record.city.trim() : ""
  const address = typeof record.address === "string" ? record.address.trim() : ""
  const country = typeof record.country === "string" && record.country.trim().length > 0 ? record.country.trim() : fallbackCountry

  const idValue = Number(record.id)

  return {
    id: Number.isFinite(idValue) && idValue > 0 ? idValue : fallbackId,
    name,
    lastname,
    email,
    password,
    dni,
    phone,
    role,
    country,
    state,
    city,
    address,
  }
}

export async function getRecruitersCatalogsServer(): Promise<RecruitersCatalogsResponse> {
  try {
    const [rolesPayload, countriesPayload, statesPayload, citiesPayload] = await Promise.all([
      readJsonFile<RecruiterRoleDummy[]>("user_admin_roles.json"),
      readJsonFile<CountryRecord[]>("country.json"),
      readJsonFile<StateRecord[]>("state.json"),
      readJsonFile<CityRecord[]>("city.json"),
    ])

    const roles = Array.isArray(rolesPayload)
      ? rolesPayload
          .map((role) => {
            const technicalName = typeof role.technical_name === "string" ? role.technical_name.trim() : ""
            const displayName = typeof role.display_name === "string" ? role.display_name.trim() : ""

            if (!technicalName || !displayName) {
              return null
            }

            return {
              technical_name: technicalName,
              display_name: displayName,
            }
          })
          .filter((role): role is { technical_name: string; display_name: string } => Boolean(role))
      : []

    const fixedCountryName = "Venezuela"

    const country = Array.isArray(countriesPayload)
      ? countriesPayload.find((item) => {
          const name = typeof item.name === "string" ? item.name.trim().toLowerCase() : ""
          return name === fixedCountryName.toLowerCase()
        })
      : undefined

    const countryId = typeof country?.id === "string" || typeof country?.id === "number"
      ? String(country.id)
      : ""

    const states = Array.isArray(statesPayload) && Array.isArray(citiesPayload)
      ? statesPayload
          .map((state) => {
            const stateId = typeof state.id === "string" || typeof state.id === "number"
              ? String(state.id)
              : ""
            const stateName = typeof state.name === "string" ? state.name.trim() : ""
            const stateCountryId = typeof state.country_id === "string" || typeof state.country_id === "number"
              ? String(state.country_id)
              : ""

            if (!countryId || stateCountryId !== countryId || !stateId || !stateName) {
              return null
            }

            const cities = Array.from(
              new Set(
                citiesPayload
                  .filter((city) => {
                    const cityStateId =
                      typeof city.state_id === "string" || typeof city.state_id === "number"
                        ? String(city.state_id)
                        : ""
                    return cityStateId === stateId
                  })
                  .map((city) => (typeof city.name === "string" ? city.name.trim() : ""))
                  .filter((cityName) => cityName.length > 0)
              )
            ).sort((a, b) => a.localeCompare(b, "es"))

            if (cities.length === 0) {
              return null
            }

            return {
              name: stateName,
              cities,
            }
          })
          .filter((state): state is { name: string; cities: string[] } => Boolean(state))
          .sort((a, b) => a.name.localeCompare(b.name, "es"))
      : []

    return {
      country: fixedCountryName,
      roles,
      states,
    }
  } catch {
    return {
      country: "Venezuela",
      roles: [
        { technical_name: "head_of_recruiters", display_name: "Jefe de reclutadores" },
        { technical_name: "recruiter", display_name: "Reclutador" },
      ],
      states: [
        { name: "Distrito Capital", cities: ["Caracas"] },
        { name: "Carabobo", cities: ["Valencia"] },
      ],
    }
  }
}

async function getAllRecruiters(): Promise<Recruiter[]> {
  const catalogs = await getRecruitersCatalogsServer()

  try {
    const payload = await readJsonFile<RecruiterDummyRecord[]>("user_admin_dummy.json")

    if (!Array.isArray(payload)) {
      return []
    }

    return payload.map((record, index) => normalizeRecruiter(record, index + 1, catalogs.country))
  } catch {
    return [
      {
        id: 1,
        name: "Mariana",
        lastname: "Pérez",
        email: "mariana.perez@talentoia.com",
        password: "M4riana!2026",
        dni: "V-12345678",
        phone: "+58 412-1112233",
        role: "head_of_recruiters",
        country: catalogs.country,
        state: "Distrito Capital",
        city: "Caracas",
        address: "Altamira",
      },
    ]
  }
}

function applyFilters(recruiters: Recruiter[], query: RecruitersQueryParams): RecruitersResponse {
  const normalizedSearch = query.search.toLowerCase()

  const filtered = recruiters.filter((recruiter) => {
    if (!normalizedSearch) {
      return true
    }

    const fullName = `${recruiter.name} ${recruiter.lastname}`.toLowerCase()

    return (
      fullName.includes(normalizedSearch) ||
      recruiter.email.toLowerCase().includes(normalizedSearch) ||
      recruiter.dni.toLowerCase().includes(normalizedSearch)
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

export async function getRecruitersServer(
  queryInput?: Partial<Record<keyof RecruitersQueryParams, string | number | undefined>>
): Promise<RecruitersResponse> {
  const query = normalizeRecruitersQuery(queryInput)
  const recruiters = await getAllRecruiters()
  return applyFilters(recruiters, query)
}

export async function getRecruiterByIdServer(recruiterId: number): Promise<Recruiter | null> {
  if (!Number.isFinite(recruiterId) || recruiterId <= 0) {
    return null
  }

  const recruiters = await getAllRecruiters()
  return recruiters.find((recruiter) => recruiter.id === recruiterId) ?? null
}

export async function createRecruiterServer(payload: RecruiterPayload): Promise<Recruiter> {
  const catalogs = await getRecruitersCatalogsServer()
  const recruiters = await getAllRecruiters()

  const nextId = recruiters.reduce((maxId, recruiter) => Math.max(maxId, recruiter.id), 0) + 1

  return {
    id: nextId,
    name: payload.name.trim(),
    lastname: payload.lastname.trim(),
    email: payload.email.trim(),
    password: payload.password.trim(),
    dni: payload.dni.trim(),
    phone: payload.phone.trim(),
    role: payload.role.trim(),
    country: catalogs.country,
    state: payload.state.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
  }
}

export async function updateRecruiterServer(recruiterId: number, payload: RecruiterPayload): Promise<Recruiter> {
  const existing = await getRecruiterByIdServer(recruiterId)
  const catalogs = await getRecruitersCatalogsServer()

  if (!existing) {
    throw new Error("Reclutador no encontrado")
  }

  return {
    ...existing,
    name: payload.name.trim(),
    lastname: payload.lastname.trim(),
    password: payload.password.trim().length > 0 ? payload.password.trim() : existing.password,
    dni: payload.dni.trim(),
    phone: payload.phone.trim(),
    role: payload.role.trim(),
    country: catalogs.country,
    state: payload.state.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
  }
}
