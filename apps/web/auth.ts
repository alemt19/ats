import { headers } from "next/headers"

type AppSession = {
  user?: {
    id?: string
    email?: string | null
    name?: string | null
    image?: string | null
    lastname?: string | null
    lastName?: string | null
    role?: string | null
  }
  accessToken?: string
}

type AdminAccessProfile = {
  id: number
  name: string | null
  lastname: string | null
  email: string | null
  profile_picture: string | null
  role: string | null
}

export type AdminAccess = {
  ok: true
  userId: string
  adminRole: string | null
  adminProfile: AdminAccessProfile
}

const betterAuthBaseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  process.env.BETTER_AUTH_BASE_URL ??
  "http://localhost:4000"

export async function getSession(): Promise<AppSession | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return null
  }

  const response = await fetch(`${betterAuthBaseURL}/api/auth/get-session`, {
    method: "GET",
    headers: {
      cookie,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const session = (await response.json()) as Record<string, unknown> | null

  if (!session || typeof session !== "object") {
    return null
  }

  const sessionRecord = session as Record<string, unknown>
  const nestedSession =
    sessionRecord.session && typeof sessionRecord.session === "object"
      ? (sessionRecord.session as Record<string, unknown>)
      : undefined

  const accessToken =
    typeof sessionRecord.accessToken === "string"
      ? sessionRecord.accessToken
      : typeof nestedSession?.token === "string"
        ? nestedSession.token
        : undefined

  return {
    ...(sessionRecord as AppSession),
    accessToken,
  }
}

export async function hasAuthAccess(scope: "admin" | "candidate"): Promise<boolean> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return false
  }

  const response = await fetch(`${betterAuthBaseURL}/api/auth/access/${scope}`, {
    method: "GET",
    headers: {
      cookie,
    },
    cache: "no-store",
  })
  return response.ok
}

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return null
  }

  const response = await fetch(`${betterAuthBaseURL}/api/auth/access/admin`, {
    method: "GET",
    headers: {
      cookie,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as AdminAccess
}
