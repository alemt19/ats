import { headers } from "next/headers"
import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const p = payload as any

  // NestJS standard or custom message
  if (typeof p.message === "string") {
    return p.message
  }

  // Wrapped API error format
  if (p.error && typeof p.error === "object") {
    if (typeof p.error.message === "string") {
      return p.error.message
    }

    // Handle ValidationIssue[]
    if (Array.isArray(p.error.message) && p.error.message.length > 0) {
      const first = p.error.message[0]
      if (typeof first === "string") return first
      if (typeof first === "object" && first.message) return first.message
    }
  }

  if (typeof p.detail === "string") {
    return p.detail
  }

  return null
}

export async function PATCH(request: Request) {
  const requestHeaders = await headers()
  const cookieHeader = requestHeaders.get("cookie") ?? ""

  try {
    const body = await request.text()

    const response = await fetch(`${backendApiUrl}/api/candidates/me/credenciales-experiencias`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body,
      cache: "no-store",
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message = extractErrorMessage(payload) ?? "No se pudieron guardar los cambios"
      return NextResponse.json({ message }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(
      { message: "Error inesperado al guardar los cambios" },
      { status: 500 }
    )
  }
}
