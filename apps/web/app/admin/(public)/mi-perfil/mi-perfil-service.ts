import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type AdminProfile,
  type AdminProfileCatalogsResponse,
  type AdminProfilePayload,
} from "./mi-perfil-types"

type UserAdminRecord = {
  id?: unknown
  profile_picture?: unknown
  name?: unknown
  lastname?: unknown
  email?: unknown
  dni?: unknown
  phone?: unknown
  role?: unknown
  country?: unknown
  state?: unknown
  city?: unknown
  address?: unknown
}

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

export type AdminProfileIdentity = {
  userId?: string
  userEmail?: string
  accessToken?: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function normalizeUserAdmin(record: UserAdminRecord, fallbackCountry: string): AdminProfile {
  const idValue = Number(record.id)

  return {
    id: Number.isFinite(idValue) && idValue > 0 ? idValue : 1,
    profile_picture: typeof record.profile_picture === "string" ? record.profile_picture.trim() : "",
    name: typeof record.name === "string" ? record.name.trim() : "",
    lastname: typeof record.lastname === "string" ? record.lastname.trim() : "",
    email: typeof record.email === "string" ? record.email.trim() : "",
    dni: typeof record.dni === "string" ? record.dni.trim() : "",
    phone: typeof record.phone === "string" ? record.phone.trim() : "",
    role: typeof record.role === "string" ? record.role.trim() : "recruiter",
    country:
      typeof record.country === "string" && record.country.trim().length > 0
        ? record.country.trim()
        : fallbackCountry,
    state: typeof record.state === "string" ? record.state.trim() : "",
    city: typeof record.city === "string" ? record.city.trim() : "",
    address: typeof record.address === "string" ? record.address.trim() : "",
  }
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

async function getDummyUserAdminProfile(identity?: AdminProfileIdentity): Promise<AdminProfile | null> {
  const catalogs = await getAdminProfileCatalogsServer()

  try {
    const payload = await readJsonFile<UserAdminRecord[]>("user_admin_dummy.json")

    if (!Array.isArray(payload) || payload.length === 0) {
      return null
    }

    const byId = identity?.userId
      ? payload.find((item) => String(item.id ?? "") === String(identity.userId))
      : null

    const byEmail = !byId && identity?.userEmail
      ? payload.find((item) => String(item.email ?? "").toLowerCase() === identity.userEmail?.toLowerCase())
      : null

    const selected = byId ?? byEmail ?? payload[0]

    if (!selected) {
      return null
    }

    return normalizeUserAdmin(selected, catalogs.country)
  } catch {
    return {
      id: 1,
      profile_picture: "https://i.pravatar.cc/150?img=12",
      name: "Admin",
      lastname: "Principal",
      email: identity?.userEmail ?? "admin@empresa.com",
      dni: "V-00000001",
      phone: "+58 412 000 0000",
      role: "head_of_recruiters",
      country: catalogs.country,
      state: "Distrito Capital",
      city: "Caracas",
      address: "Av. Principal",
    }
  }
}

export async function getAdminProfileServer(identity?: AdminProfileIdentity): Promise<AdminProfile | null> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

  try {
    const response = await fetch(`${apiBaseUrl}/admin/mi-perfil`, {
      method: "GET",
      headers: {
        ...(identity?.accessToken ? { Authorization: `Bearer ${identity.accessToken}` } : {}),
        ...(identity?.userId ? { "x-user-id": identity.userId } : {}),
        ...(identity?.userEmail ? { "x-user-email": identity.userEmail } : {}),
      },
      cache: "no-store",
    })

    if (response.ok) {
      const payload = (await response.json()) as UserAdminRecord
      const catalogs = await getAdminProfileCatalogsServer()
      return normalizeUserAdmin(payload, catalogs.country)
    }
  } catch {
    // fallback to dummy while backend endpoint is pending
  }

  return getDummyUserAdminProfile(identity)
}

export async function updateAdminProfileServer(
  payload: AdminProfilePayload,
  identity?: AdminProfileIdentity
): Promise<AdminProfile> {
  const existing = await getAdminProfileServer(identity)
  const catalogs = await getAdminProfileCatalogsServer()

  if (!existing) {
    throw new Error("Perfil no encontrado")
  }

  return {
    ...existing,
    profile_picture: payload.profile_picture?.trim() ? payload.profile_picture.trim() : existing.profile_picture,
    name: payload.name.trim(),
    lastname: payload.lastname.trim(),
    dni: payload.dni.trim(),
    phone: `${payload.phone_prefix.trim()} ${payload.phone.trim()}`.trim(),
    country: catalogs.country,
    state: payload.state.trim(),
    city: payload.city.trim(),
    address: payload.address.trim(),
  }
}
