import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type AdminProfile,
  type AdminProfileCatalogsResponse,
  type AdminProfilePayload,
} from "./mi-perfil-types"

type RoleRecord = {
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
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message
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

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

export async function getAdminProfileCatalogsServer(): Promise<AdminProfileCatalogsResponse> {
  try {
    const [rolesPayload, countriesPayload, statesPayload, citiesPayload] = await Promise.all([
      readJsonFile<RoleRecord[]>("user_admin_roles.json"),
      readJsonFile<CountryRecord[]>("country.json"),
      readJsonFile<StateRecord[]>("state.json"),
      readJsonFile<CityRecord[]>("city.json"),
    ])

    const fixedCountryName = "Venezuela"

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
            const stateId = typeof state.id === "string" || typeof state.id === "number" ? String(state.id) : ""
            const stateName = typeof state.name === "string" ? state.name.trim() : ""
            const stateCountryId =
              typeof state.country_id === "string" || typeof state.country_id === "number"
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

export async function getAdminProfileServer(cookie?: string): Promise<AdminProfile | null> {
  const response = await fetch(`${backendApiUrl}/api/admin/mi-perfil`, {
    method: "GET",
    headers: backendHeaders(cookie),
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  return parseBackendResponse<AdminProfile>(response, "No se pudo cargar el perfil")
}

export async function updateAdminProfileServer(
  payload: AdminProfilePayload | FormData,
  cookie?: string
): Promise<AdminProfile> {
  const body = payload instanceof FormData ? payload : JSON.stringify(payload)
  const headers: HeadersInit = payload instanceof FormData
    ? backendHeaders(cookie)
    : {
        "Content-Type": "application/json",
        ...backendHeaders(cookie),
      }

  const response = await fetch(`${backendApiUrl}/api/admin/mi-perfil`, {
    method: "PUT",
    headers,
    body,
    cache: "no-store",
  })

  return parseBackendResponse<AdminProfile>(response, "No se pudo actualizar el perfil")
}
