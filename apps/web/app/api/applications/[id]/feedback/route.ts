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
    return NextResponse.json({ employer: null, candidate: null })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${applicationId}/feedback`, {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  })

  const backendPayload = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json({ employer: null, candidate: null })
  }

  return NextResponse.json(backendPayload)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const applicationId = Number(params.id)

  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return NextResponse.json({ message: "ID de postulación inválido" }, { status: 400 })
  }

  const payload = await request.json().catch(() => null)
  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${applicationId}/feedback`, {
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
    const message =
      (backendPayload as { message?: string } | null)?.message ?? "No se pudo guardar la retroalimentación"
    return NextResponse.json({ message }, { status: response.status })
  }

  return NextResponse.json(backendPayload)
}
