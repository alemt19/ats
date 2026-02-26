import { NextResponse } from "next/server"

import {
  createRecruiterServer,
  getRecruitersServer,
} from "../../../admin/(public)/reclutadores/recruiters-admin-service"
import type { RecruiterPayload } from "../../../admin/(public)/reclutadores/recruiters-admin-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isInvalidPayload(payload: RecruiterPayload) {
  return (
    payload.name.trim().length === 0 ||
    payload.lastname.trim().length === 0 ||
    payload.email.trim().length === 0 ||
    payload.password.trim().length === 0 ||
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

export async function GET(request: Request) {
  const url = new URL(request.url)

  const data = await getRecruitersServer({
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  const payload = parseRecruiterPayload(body)

  if (isInvalidPayload(payload)) {
    return NextResponse.json({ message: "Completa los campos requeridos" }, { status: 400 })
  }

  const created = await createRecruiterServer(payload)
  return NextResponse.json(created, { status: 201 })
}
