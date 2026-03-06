import { NextResponse } from "next/server"

import { getAdminOffersServer } from "../../../admin/(public)/ofertas/offers-admin-service"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)

  const data = await getAdminOffersServer({
    title: url.searchParams.get("title") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    workplace_type: url.searchParams.get("workplace_type") ?? undefined,
    employment_type: url.searchParams.get("employment_type") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}

function parseBackendMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message
  }

  if (
    "message" in payload &&
    Array.isArray(payload.message) &&
    payload.message.length > 0 &&
    typeof payload.message[0] === "string"
  ) {
    return payload.message[0]
  }

  if (
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
  ) {
    if (typeof payload.error.message === "string") {
      return payload.error.message
    }

    if (
      Array.isArray(payload.error.message) &&
      payload.error.message.length > 0
    ) {
      const firstMessage = payload.error.message[0]

      if (typeof firstMessage === "string") {
        return firstMessage
      }

      if (
        firstMessage &&
        typeof firstMessage === "object" &&
        "message" in firstMessage &&
        typeof firstMessage.message === "string"
      ) {
        return firstMessage.message
      }
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ message: "Payload invalido" }, { status: 400 })
    }

    const cookie = request.headers.get("cookie") ?? ""

    const response = await fetch(`${backendApiUrl}/api/admin/ofertas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const backendPayload = await response.json().catch(() => null)

    if (!response.ok) {
      const message = parseBackendMessage(backendPayload) ?? "No se pudo crear la oferta"
      return NextResponse.json({ message }, { status: response.status })
    }

    return NextResponse.json(backendPayload)
  } catch {
    return NextResponse.json({ message: "Error inesperado al crear la oferta" }, { status: 500 })
  }
}
