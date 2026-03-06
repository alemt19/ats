import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

      if (first && typeof first === "object" && "message" in first && typeof first.message === "string") {
        return first.message
      }
    }
  }

  return null
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const offerId = Number(params.id)

  if (!Number.isFinite(offerId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/admin/ofertas/${offerId}`, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = parseBackendMessage(payload) ?? "No se pudo cargar la oferta"
    return NextResponse.json({ message }, { status: response.status })
  }

  const detail = payload && typeof payload === "object" && "data" in payload ? payload.data : payload

  if (!detail) {
    return NextResponse.json({ message: "Oferta no encontrada" }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const offerId = Number(params.id)

  if (!Number.isFinite(offerId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 })
  }

  const incomingPayload = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!incomingPayload) {
    return NextResponse.json({ message: "Payload invalido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/admin/ofertas/${offerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(incomingPayload),
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = parseBackendMessage(payload) ?? "No se pudo actualizar la oferta"
    return NextResponse.json({ message }, { status: response.status })
  }

  const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload
  return NextResponse.json(data)
}
