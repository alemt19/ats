import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type LoginApiResponse = {
  success?: boolean
  timestamp?: string
  data?: {
    userId?: string
    email?: string
    token?: string
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-only-nextauth-secret-change-in-production"

export const { handlers } = NextAuth({
  trustHost: true,
  secret: nextAuthSecret,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

        const response = await fetch(`${apiBaseUrl}/auth/login`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })

        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as LoginApiResponse
        const loginData = payload.data

        if (!loginData?.userId || !loginData?.email || !loginData.token) {
          return null
        }

        return {
          id: loginData.userId,
          email: loginData.email,
          accessToken: loginData.token,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/examples/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id as string
        token.email = user.email
        token.accessToken = user.accessToken
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ""
      }

      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined
      return session
    },
  },
})

export const { GET, POST } = handlers