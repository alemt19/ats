import { NextResponse } from "next/server"

import { getAdminOffersCatalogsServer } from "../../../../admin/(public)/ofertas/offers-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? undefined

  try {
    const data = await getAdminOffersCatalogsServer(cookie)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los catalogos"
    return NextResponse.json({ message }, { status: 500 })
  }
}
