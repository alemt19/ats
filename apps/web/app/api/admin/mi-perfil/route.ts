import { NextResponse } from "next/server"

import {
  BackendRequestError,
  getAdminProfileServer,
  updateAdminProfileServer,
} from "../../../admin/(public)/mi-perfil/mi-perfil-service"
import type { AdminProfilePayload } from "../../../admin/(public)/mi-perfil/mi-perfil-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parsePayload(body: unknown): AdminProfilePayload {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {}

  return {
    profile_picture: typeof source.profile_picture === "string" ? source.profile_picture : undefined,
    name: typeof source.name === "string" ? source.name : "",
    lastname: typeof source.lastname === "string" ? source.lastname : "",
    birth_date: typeof source.birth_date === "string" ? source.birth_date : "",
    dni: typeof source.dni === "string" ? source.dni : "",
    phone: typeof source.phone === "string" ? source.phone : "",
    phone_prefix: typeof source.phone_prefix === "string" ? source.phone_prefix : "",
    state: typeof source.state === "string" ? source.state : "",
    city: typeof source.city === "string" ? source.city : "",
    address: typeof source.address === "string" ? source.address : "",
  }
}

function parseMultipartPayload(formData: FormData): AdminProfilePayload {
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
    birth_date: typeof formData.get("birth_date") === "string" ? (formData.get("birth_date") as string) : "",
    dni: typeof formData.get("dni") === "string" ? (formData.get("dni") as string) : "",
    phone: typeof formData.get("phone") === "string" ? (formData.get("phone") as string) : "",
    phone_prefix:
      typeof formData.get("phone_prefix") === "string" ? (formData.get("phone_prefix") as string) : "",
    state: typeof formData.get("state") === "string" ? (formData.get("state") as string) : "",
    city: typeof formData.get("city") === "string" ? (formData.get("city") as string) : "",
    address: typeof formData.get("address") === "string" ? (formData.get("address") as string) : "",
  }
}

function isInvalidPayload(payload: AdminProfilePayload) {
  return (
    payload.name.trim().length === 0 ||
    payload.lastname.trim().length === 0 ||
    payload.state.trim().length === 0 ||
    payload.city.trim().length === 0 ||
    payload.address.trim().length === 0
  )
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined

  let profile = null

  try {
    profile = await getAdminProfileServer(cookie)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo cargar el perfil" }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ message: "Perfil no encontrado" }, { status: 404 })
  }

  return NextResponse.json(profile)
}

export async function PUT(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined
  const contentType = request.headers.get("content-type") ?? ""

  const payload = contentType.includes("multipart/form-data")
    ? await request.formData()
    : parsePayload((await request.json().catch(() => null)) as unknown)

  const normalizedPayload = payload instanceof FormData ? parseMultipartPayload(payload) : payload

  if (isInvalidPayload(normalizedPayload)) {
    return NextResponse.json({ message: "Completa los campos requeridos" }, { status: 400 })
  }

  try {
    const updated = await updateAdminProfileServer(payload, cookie)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo actualizar el perfil" }, { status: 500 })
  }
}
