import { NextResponse } from "next/server"

import { getCandidateByIdServer } from "../../../../admin/(public)/candidatos/candidates-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Candidato no encontrado" }, { status: 404 })
  }

  const candidate = await getCandidateByIdServer(numericId)

  if (!candidate) {
    return NextResponse.json({ message: "Candidato no encontrado" }, { status: 404 })
  }

  return NextResponse.json(candidate)
}
