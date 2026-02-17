import path from "node:path"
import { readFile } from "node:fs/promises"

import { auth } from "../../../auth"
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
  userId: string,
  accessToken?: string
): Promise<UserProfileResponse> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

  try {
    const response = await fetch(`${apiBaseUrl}/profile/me`, {
      method: "GET",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: "no-store",
    })

    if (response.ok) {
      const payload = (await response.json()) as UserProfileResponse
      return payload
    }
  } catch {
    // Fallback to mock data while backend endpoint is not implemented.
  }

  return {
    profile_picture: "https://i.pravatar.cc/150?img=32",
    name: "Carla",
    lastname: "Lopez",
    country: "232",
    state: "3979",
    city: "99031",
    address: "Av. Principal, Torre 2",
    contact_page: "https://linkedin.com/in/carla-lopez",
    phone: "4121234567",
    dni: "V-12345678",
  }
}

export default async function MisDatosPage() {
  const session = await auth()
  const userId = session?.user?.id ?? "user_123"
  const accessToken = session?.accessToken

  const [countries, states, cities, initialProfile] = await Promise.all([
    readJsonFile<Country[]>("country.json"),
    readJsonFile<State[]>("state.json"),
    readJsonFile<City[]>("city.json"),
    fetchProfileDataServer(userId, accessToken),
  ])

  return (
    <MisDatosForm
      initialProfile={initialProfile}
      countries={countries}
      states={states}
      cities={cities}
      userId={userId}
    />
  )
}