import { NextResponse } from "next/server"

import {
  BackendRequestError,
  createAdminCategoryServer,
  getAdminCategoriesServer,
} from "../../../admin/(public)/categorias/categories-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const cookie = request.headers.get("cookie") ?? undefined

  try {
    const data = await getAdminCategoriesServer(
      {
        name: url.searchParams.get("name") ?? undefined,
        page: url.searchParams.get("page") ?? undefined,
        pageSize: url.searchParams.get("pageSize") ?? undefined,
      },
      cookie
    )

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudieron cargar las categorías" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined
  const payload = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof payload?.name === "string" ? payload.name.trim() : ""

  if (!name) {
    return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 })
  }

  try {
    const created = await createAdminCategoryServer(name, cookie)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo crear la categoría" }, { status: 500 })
  }
}
