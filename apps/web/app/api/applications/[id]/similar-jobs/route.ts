import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const applicationId = Number(params.id)

  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return NextResponse.json({ message: "ID de postulación inválido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${applicationId}/similar-jobs`, {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "No se pudieron cargar ofertas similares")
        : "No se pudieron cargar ofertas similares"

    return NextResponse.json({ message }, { status: response.status >= 400 ? response.status : 500 })
  }

  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload

  return NextResponse.json(Array.isArray(data) ? data : [])
}
