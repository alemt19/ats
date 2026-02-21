import { NextResponse } from "next/server"

import { getAdminOffersCatalogsServer } from "../../../../admin/(public)/ofertas/offers-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getAdminOffersCatalogsServer()
  return NextResponse.json(data)
}
