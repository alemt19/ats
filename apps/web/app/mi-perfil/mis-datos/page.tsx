import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"

import { getSession } from "../../../auth"
import MisDatosForm, {
  type City,
  type Country,
  type ProfileFormValues,
  type State,
} from "./mis-datos-form"

type UserProfileResponse = Partial<ProfileFormValues>

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

async function fetchProfileDataServer(
  cookie: string
): Promise<UserProfileResponse> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

  try {
    const response = await fetch(`${apiBaseUrl}/api/candidates/me`, {
      method: "GET",
      headers: {
				cookie,
      },
      cache: "no-store",
    })

    if (response.ok) {
      const payload = (await response.json()) as {
			success?: boolean
			data?: UserProfileResponse
		}

			return payload.data ?? {}
    }
  } catch {
		// Return empty profile if backend is unavailable.
  }

	return {}
}

export default async function MisDatosPage() {
  const session = await getSession()
	const userId = session?.user?.id ?? ""
	const requestHeaders = await headers()
	const cookie = requestHeaders.get("cookie") ?? ""

  const [countries, states, cities, initialProfile] = await Promise.all([
    readJsonFile<Country[]>("country.json"),
    readJsonFile<State[]>("state.json"),
    readJsonFile<City[]>("city.json"),
		fetchProfileDataServer(cookie),
  ])

  return (
    <MisDatosForm
      initialProfile={initialProfile}
      countries={countries}
      states={states}
      cities={cities}
    />
  )
}