import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const value = payload as Record<string, unknown>
  if (typeof value.message === "string") return value.message

  if (value.error && typeof value.error === "object") {
    const errorValue = value.error as Record<string, unknown>
    if (typeof errorValue.message === "string") return errorValue.message
  }

  return null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const jobId = Number(params.id)

  if (!Number.isFinite(jobId) || jobId <= 0) {
    return NextResponse.json({ message: "ID de oferta inválido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  if (!cookie) {
    return NextResponse.json({ message: "Sesión requerida" }, { status: 401 })
  }

  const refreshRes = await fetch(`${backendApiUrl}/api/applications/me/${jobId}/refresh`, {
    method: "POST",
    headers: { cookie },
    cache: "no-store",
  })

  const payload = await refreshRes.json().catch(() => null)

  if (!refreshRes.ok) {
    const message = extractMessage(payload) ?? "No se pudo refrescar la postulación"
    return NextResponse.json({ message }, { status: refreshRes.status >= 400 ? refreshRes.status : 500 })
  }

  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload

  return NextResponse.json(data ?? { ok: true, evaluationStatus: "pending" })
}
