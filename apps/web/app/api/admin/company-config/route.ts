import { NextResponse } from "next/server"

import {
  BackendRequestError,
  getCompanyConfigServer,
  updateCompanyConfigServer,
} from "../../../admin/(public)/configuracion/company-config-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined

  try {
    const payload = await getCompanyConfigServer(cookie)
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo cargar la configuración" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined
  const contentType = request.headers.get("content-type") ?? ""

  try {
    const payload = contentType.includes("multipart/form-data")
      ? await request.formData()
      : ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {}

    const updated = await updateCompanyConfigServer(payload, cookie)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof BackendRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    return NextResponse.json({ message: "No se pudo guardar la configuración" }, { status: 500 })
  }
}
