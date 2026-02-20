import { NextResponse } from "next/server"

import { getOffersCatalogsServer } from "../../../(public)/ofertas/offers-catalogs-service"

export async function GET() {
  const data = await getOffersCatalogsServer()
  return NextResponse.json(data)
}
