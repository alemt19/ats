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
  profile_picture?: unknown
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
  phonecode?: unknown
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

type BackendEnvelope<T> = {
  success?: boolean
  data?: T
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
  if (!response.ok) {
    const fallbackMessage = "No se pudo completar la operación de reclutadores"
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null
    throw new BackendRequestError(errorBody?.message ?? fallbackMessage, response.status)
  }

  const payload = (await response.json()) as BackendEnvelope<T> | T

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as BackendEnvelope<T>).data as T
  }

  return payload as T
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
  const profilePicture = typeof record.profile_picture === "string" ? record.profile_picture.trim() : ""
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
    profile_picture: profilePicture,
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

    const countryPhoneCode =
      typeof country?.phonecode === "string" || typeof country?.phonecode === "number"
        ? String(country.phonecode).trim()
        : ""

    const countryPhonePrefix = countryPhoneCode.length > 0 ? `+${countryPhoneCode}` : ""

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
      country_phone_prefix: countryPhonePrefix,
      roles,
      states,
    }
  } catch {
    return {
      country: "Venezuela",
      country_phone_prefix: "+58",
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

export async function getRecruitersServer(
  queryInput?: Partial<Record<keyof RecruitersQueryParams, string | number | undefined>>,
  cookie?: string,
): Promise<RecruitersResponse> {
  const query = normalizeRecruitersQuery(queryInput)

	const params = new URLSearchParams()
	if (query.search) {
		params.set("search", query.search)
	}
	params.set("page", String(query.page))
	params.set("pageSize", String(query.pageSize))

	const response = await fetch(`${backendApiUrl}/api/admin/reclutadores?${params.toString()}`, {
		method: "GET",
		headers: backendHeaders(cookie),
		cache: "no-store",
	})

	return parseBackendResponse<RecruitersResponse>(response)
}

export async function getRecruiterByIdServer(recruiterId: number, cookie?: string): Promise<Recruiter | null> {
  if (!Number.isFinite(recruiterId) || recruiterId <= 0) {
    return null
  }

	const response = await fetch(`${backendApiUrl}/api/admin/reclutadores/${recruiterId}`, {
		method: "GET",
		headers: backendHeaders(cookie),
		cache: "no-store",
	})

	if (response.status === 404) {
		return null
	}

	return parseBackendResponse<Recruiter>(response)
}

export async function createRecruiterServer(payload: RecruiterPayload | FormData, cookie?: string): Promise<Recruiter> {
  const body = payload instanceof FormData ? payload : JSON.stringify(payload)
  const headers: HeadersInit = payload instanceof FormData
    ? backendHeaders(cookie)
    : {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    }

  const response = await fetch(`${backendApiUrl}/api/admin/reclutadores`, {
    method: "POST",
    headers,
    body,
  })

	return parseBackendResponse<Recruiter>(response)
}

export async function updateRecruiterServer(
	recruiterId: number,
  payload: RecruiterPayload | FormData,
	cookie?: string,
): Promise<Recruiter> {
  const body = payload instanceof FormData ? payload : JSON.stringify(payload)
  const headers: HeadersInit = payload instanceof FormData
    ? backendHeaders(cookie)
    : {
      "Content-Type": "application/json",
      ...backendHeaders(cookie),
    }

	const response = await fetch(`${backendApiUrl}/api/admin/reclutadores/${recruiterId}`, {
		method: "PUT",
    headers,
    body,
	})

	return parseBackendResponse<Recruiter>(response)
}
