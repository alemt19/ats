import { NextResponse } from "next/server"

import {
  createAdminCategoryServer,
  getAdminCategoriesServer,
} from "../../../admin/(public)/categorias/categories-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)

  const data = await getAdminCategoriesServer({
    name: url.searchParams.get("name") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof payload?.name === "string" ? payload.name.trim() : ""

  if (!name) {
    return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 })
  }

  const created = await createAdminCategoryServer(name)
  return NextResponse.json(created, { status: 201 })
}
