import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; candidate_id: string }>
}

function parseBackendMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message
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

    if (Array.isArray(payload.error.message) && payload.error.message.length > 0) {
      const first = payload.error.message[0]

      if (typeof first === "string") {
        return first
      }
    }
  }

  return null
}

function parseRouteParams(params: { id: string; candidate_id: string }) {
  const offerId = Number(params.id)
  const applicationId = Number(params.candidate_id)

  if (!Number.isFinite(offerId) || !Number.isFinite(applicationId)) {
    return null
  }

  return { applicationId }
}

export async function GET(request: Request, context: RouteContext) {
  const params = parseRouteParams(await context.params)

  if (!params) {
    return NextResponse.json({ message: "Identificadores inválidos" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${params.applicationId}/notes`, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  })

  const backendPayload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = parseBackendMessage(backendPayload) ?? "No se pudieron cargar las notas"
    return NextResponse.json({ message }, { status: response.status })
  }

  const data =
    backendPayload && typeof backendPayload === "object" && "data" in backendPayload
      ? (backendPayload as { data?: unknown }).data
      : backendPayload

  return NextResponse.json(Array.isArray(data) ? data : [])
}

export async function POST(request: Request, context: RouteContext) {
  const params = parseRouteParams(await context.params)

  if (!params) {
    return NextResponse.json({ message: "Identificadores inválidos" }, { status: 400 })
  }

  const payload = (await request.json().catch(() => null)) as { text?: string } | null
  const text = typeof payload?.text === "string" ? payload.text.trim() : ""

  if (!text) {
    return NextResponse.json({ message: "La nota no puede estar vacía" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${params.applicationId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ text }),
    cache: "no-store",
  })

  const backendPayload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = parseBackendMessage(backendPayload) ?? "No se pudo guardar la nota"
    return NextResponse.json({ message }, { status: response.status })
  }

  const data =
    backendPayload && typeof backendPayload === "object" && "data" in backendPayload
      ? (backendPayload as { data?: unknown }).data
      : backendPayload

  if (!data || typeof data !== "object") {
    return NextResponse.json({ message: "Respuesta inválida al guardar nota" }, { status: 502 })
  }

  return NextResponse.json(data, { status: 201 })
}