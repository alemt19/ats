import { NextResponse } from "next/server"

import {
  BackendRequestError,
  getAdminGenericJobDescriptionByIdServer,
  updateAdminGenericJobDescriptionServer,
} from "../../../../admin/(public)/descripciones-ofertas/generic-job-descriptions-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const cookie = request.headers.get("cookie") ?? undefined
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Descripción no encontrada" }, { status: 404 })
  }

  let data = null

  try {
    data = await getAdminGenericJobDescriptionByIdServer(numericId, cookie)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo cargar la descripción" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ message: "Descripción no encontrada" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request, context: RouteContext) {
  const cookie = request.headers.get("cookie") ?? undefined
  const { id } = await context.params
  const numericId = Number(id)
  const payload = (await request.json().catch(() => null)) as { position?: unknown; description?: unknown } | null
  const position = typeof payload?.position === "string" ? payload.position.trim() : ""
  const description = typeof payload?.description === "string" ? payload.description.trim() : ""

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Descripción inválida" }, { status: 400 })
  }

  if (!position) {
    return NextResponse.json({ message: "El puesto es requerido" }, { status: 400 })
  }

  if (!description) {
    return NextResponse.json({ message: "La descripción es requerida" }, { status: 400 })
  }

  try {
    const updated = await updateAdminGenericJobDescriptionServer(numericId, { position, description }, cookie)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo actualizar la descripción" }, { status: 500 })
  }
}