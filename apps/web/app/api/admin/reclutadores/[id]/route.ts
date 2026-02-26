import { NextResponse } from "next/server"

import {
  getRecruiterByIdServer,
  updateRecruiterServer,
} from "../../../../admin/(public)/reclutadores/recruiters-admin-service"
import type { RecruiterPayload } from "../../../../admin/(public)/reclutadores/recruiters-admin-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

function isInvalidPayload(payload: RecruiterPayload) {
  return (
    payload.name.trim().length === 0 ||
    payload.lastname.trim().length === 0 ||
    payload.role.trim().length === 0 ||
    payload.state.trim().length === 0 ||
    payload.city.trim().length === 0 ||
    payload.address.trim().length === 0
  )
}

function parseRecruiterPayload(body: unknown): RecruiterPayload {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {}

  return {
    name: typeof source.name === "string" ? source.name : "",
    lastname: typeof source.lastname === "string" ? source.lastname : "",
    email: typeof source.email === "string" ? source.email : "",
    password: typeof source.password === "string" ? source.password : "",
    dni: typeof source.dni === "string" ? source.dni : "",
    phone: typeof source.phone === "string" ? source.phone : "",
    role: typeof source.role === "string" ? source.role : "",
    country: typeof source.country === "string" ? source.country : "",
    state: typeof source.state === "string" ? source.state : "",
    city: typeof source.city === "string" ? source.city : "",
    address: typeof source.address === "string" ? source.address : "",
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Reclutador no encontrado" }, { status: 404 })
  }

  const recruiter = await getRecruiterByIdServer(numericId)

  if (!recruiter) {
    return NextResponse.json({ message: "Reclutador no encontrado" }, { status: 404 })
  }

  return NextResponse.json(recruiter)
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Reclutador inválido" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as unknown
  const payload = parseRecruiterPayload(body)

  if (isInvalidPayload(payload)) {
    return NextResponse.json({ message: "Completa los campos requeridos" }, { status: 400 })
  }

  try {
    const updated = await updateRecruiterServer(numericId, payload)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ message: "Reclutador no encontrado" }, { status: 404 })
  }
}
