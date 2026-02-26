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
    profile_picture: typeof source.profile_picture === "string" ? source.profile_picture : undefined,
    name: typeof source.name === "string" ? source.name : "",
    lastname: typeof source.lastname === "string" ? source.lastname : "",
    email: typeof source.email === "string" ? source.email : "",
    password: typeof source.password === "string" ? source.password : "",
    dni: typeof source.dni === "string" ? source.dni : "",
    phone: typeof source.phone === "string" ? source.phone : "",
    phone_prefix: typeof source.phone_prefix === "string" ? source.phone_prefix : "",
    role: typeof source.role === "string" ? source.role : "",
    country: typeof source.country === "string" ? source.country : "",
    state: typeof source.state === "string" ? source.state : "",
    city: typeof source.city === "string" ? source.city : "",
    address: typeof source.address === "string" ? source.address : "",
  }
}

function parseRecruiterMultipartPayload(formData: FormData): RecruiterPayload {
  const profilePicture = formData.get("profile_picture")

  return {
    profile_picture:
      typeof profilePicture === "string"
        ? profilePicture
        : profilePicture instanceof File
          ? profilePicture.name
          : undefined,
    name: typeof formData.get("name") === "string" ? (formData.get("name") as string) : "",
    lastname: typeof formData.get("lastname") === "string" ? (formData.get("lastname") as string) : "",
    email: typeof formData.get("email") === "string" ? (formData.get("email") as string) : "",
    password: typeof formData.get("password") === "string" ? (formData.get("password") as string) : "",
    dni: typeof formData.get("dni") === "string" ? (formData.get("dni") as string) : "",
    phone: typeof formData.get("phone") === "string" ? (formData.get("phone") as string) : "",
    phone_prefix:
      typeof formData.get("phone_prefix") === "string" ? (formData.get("phone_prefix") as string) : "",
    role: typeof formData.get("role") === "string" ? (formData.get("role") as string) : "",
    country: typeof formData.get("country") === "string" ? (formData.get("country") as string) : "",
    state: typeof formData.get("state") === "string" ? (formData.get("state") as string) : "",
    city: typeof formData.get("city") === "string" ? (formData.get("city") as string) : "",
    address: typeof formData.get("address") === "string" ? (formData.get("address") as string) : "",
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

  const contentType = request.headers.get("content-type") ?? ""

  const payload = contentType.includes("multipart/form-data")
    ? parseRecruiterMultipartPayload(await request.formData())
    : parseRecruiterPayload((await request.json().catch(() => null)) as unknown)

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
