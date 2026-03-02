import { createAuthClient } from "better-auth/react"

const authBaseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

export const authClient = createAuthClient({
	baseURL: authBaseURL,
	basePath: "/api/auth",
})

export const { signIn, signUp, signOut, useSession } = authClient