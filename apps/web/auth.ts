import { headers } from "next/headers"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"

type AppSession = {
  user?: {
    id?: string
    email?: string | null
    name?: string | null
    image?: string | null
    lastname?: string | null
    lastName?: string | null
  }
  accessToken?: string
}

const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ??
  process.env.AUTH_SECRET ??
  "dev-only-better-auth-secret-change-in-production"

const betterAuthBaseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.AUTH_URL ??
  "http://localhost:3000"

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: betterAuthBaseURL,
  basePath: "/api/auth",
  plugins: [nextCookies()],
})

export async function getSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

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
