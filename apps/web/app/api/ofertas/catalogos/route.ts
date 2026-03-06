import { NextResponse } from "next/server"

import { getOffersCatalogsServer } from "../../../(public)/ofertas/offers-catalogs-service"

export async function GET() {
  try {
    const data = await getOffersCatalogsServer()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "No se pudieron cargar los catalogos" },
      { status: 502 }
    )
  }
}
