import { NextResponse } from "next/server"

import {
  BackendRequestError,
  getAdminCategoryByIdServer,
  updateAdminCategoryServer,
} from "../../../../admin/(public)/categorias/categories-admin-service"

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
    return NextResponse.json({ message: "Categoría no encontrada" }, { status: 404 })
  }

  let data = null

  try {
    data = await getAdminCategoryByIdServer(numericId, cookie)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo cargar la categoría" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ message: "Categoría no encontrada" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request, context: RouteContext) {
  const cookie = request.headers.get("cookie") ?? undefined
  const { id } = await context.params
  const numericId = Number(id)
  const payload = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof payload?.name === "string" ? payload.name.trim() : ""

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Categoría inválida" }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 })
  }

  try {
    const updated = await updateAdminCategoryServer(numericId, name, cookie)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo actualizar la categoría" }, { status: 500 })
  }
}
