import { NextResponse } from "next/server"

import {
  getAdminCategoryByIdServer,
  updateAdminCategoryServer,
} from "../../../../admin/(public)/categorias/categories-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Categoría no encontrada" }, { status: 404 })
  }

  const data = await getAdminCategoryByIdServer(numericId)

  if (!data) {
    return NextResponse.json({ message: "Categoría no encontrada" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request, context: RouteContext) {
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

  const updated = await updateAdminCategoryServer(numericId, name)
  return NextResponse.json(updated)
}
