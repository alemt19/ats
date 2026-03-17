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

export async function PATCH(request: Request, context: RouteContext) {
  const { id, candidate_id: candidateId } = await context.params
  const offerId = Number(id)
  const applicationId = Number(candidateId)

  if (!Number.isFinite(offerId) || !Number.isFinite(applicationId)) {
    return NextResponse.json({ message: "Identificadores inválidos" }, { status: 400 })
  }

  const payload = (await request.json().catch(() => null)) as { status?: string } | null
  const status = typeof payload?.status === "string" ? payload.status.trim() : ""

  if (!status) {
    return NextResponse.json({ message: "El estado es requerido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${applicationId}/admin-status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  })

  const backendPayload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = parseBackendMessage(backendPayload) ?? "No se pudo actualizar el estado"
    return NextResponse.json({ message }, { status: response.status })
  }

  return NextResponse.json(backendPayload)
}