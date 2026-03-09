import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.message === "string") return p.message
  if (p.error && typeof p.error === "object") {
    const e = p.error as Record<string, unknown>
    if (typeof e.message === "string") return e.message
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
    return NextResponse.json({ message: "Sesión requerida para postularse" }, { status: 401 })
  }

  // Resolve candidate record from the authenticated session
  const candidateRes = await fetch(`${backendApiUrl}/api/candidates/me`, {
    headers: { cookie },
    cache: "no-store",
  })

  if (!candidateRes.ok) {
    const status = candidateRes.status === 401 ? 401 : 400
    console.error("Error fetching candidate profile:", { status, response: await candidateRes.text().catch(() => null) })
    return NextResponse.json(
      { message: status === 401 ? "Sesión expirada, inicia sesión nuevamente" : "Perfil de candidato no encontrado" },
      { status }
    )
  }

  const candidatePayload = await candidateRes.json().catch(() => null)
  // candidates/me returns the candidate object directly (no envelope)
  const candidateData = (candidatePayload?.data ?? candidatePayload) as Record<string, unknown> | null
  const candidateId = typeof candidateData?.id === "number" ? candidateData.id : null

  if (candidateId === null) {
    return NextResponse.json({ message: "Perfil de candidato no encontrado" }, { status: 400 })
  }

  // Submit application
  const applyRes = await fetch(`${backendApiUrl}/api/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    body: JSON.stringify({ job_id: jobId, candidate_id: candidateId }),
    cache: "no-store",
  })

  const applyPayload = await applyRes.json().catch(() => null)

  if (!applyRes.ok) {
    // 409 or Prisma unique constraint (P2002 may surface as 409 after service fix)
    if (applyRes.status === 409) {
      return NextResponse.json({ message: "Ya te has postulado a esta oferta" }, { status: 409 })
    }
    const message = extractMessage(applyPayload) ?? "No se pudo completar la postulación"
    return NextResponse.json({ message }, { status: applyRes.status >= 400 ? applyRes.status : 500 })
  }

  return NextResponse.json({ ok: true })
}
