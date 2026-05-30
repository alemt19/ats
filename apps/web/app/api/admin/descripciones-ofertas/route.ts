import { NextResponse } from "next/server"

import {
  BackendRequestError,
  createAdminGenericJobDescriptionServer,
  getAdminGenericJobDescriptionsServer,
} from "../../../admin/(public)/descripciones-ofertas/generic-job-descriptions-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const cookie = request.headers.get("cookie") ?? undefined

  try {
    const data = await getAdminGenericJobDescriptionsServer(
      {
        search: url.searchParams.get("search") ?? undefined,
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

    return NextResponse.json({ message: "No se pudieron cargar los puestos predefinidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined
  const payload = (await request.json().catch(() => null)) as { position?: unknown; description?: unknown } | null
  const position = typeof payload?.position === "string" ? payload.position.trim() : ""
  const description = typeof payload?.description === "string" ? payload.description.trim() : ""

  if (!position) {
    return NextResponse.json({ message: "El puesto es requerido" }, { status: 400 })
  }

  if (!description) {
    return NextResponse.json({ message: "La descripción es requerida" }, { status: 400 })
  }

  try {
    const created = await createAdminGenericJobDescriptionServer({ position, description }, cookie)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo crear la descripción de oferta" }, { status: 500 })
  }
}