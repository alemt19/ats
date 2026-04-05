import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; candidate_id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { candidate_id: candidateId } = await context.params
  const applicationId = Number(candidateId)

  if (!Number.isFinite(applicationId)) {
    return NextResponse.json({ message: "Identificador inválido" }, { status: 400 })
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
      (backendPayload as { message?: string } | null)?.message ?? "No se pudo guardar el feedback"
    return NextResponse.json({ message }, { status: response.status })
  }

  return NextResponse.json(backendPayload)
}

export async function GET(request: Request, context: RouteContext) {
  const { candidate_id: candidateId } = await context.params
  const applicationId = Number(candidateId)

  if (!Number.isFinite(applicationId)) {
    return NextResponse.json({ message: "Identificador inválido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/${applicationId}/feedback`, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  })

  const backendPayload = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json({ employer: null, candidate: null })
  }

  return NextResponse.json(backendPayload)
}
