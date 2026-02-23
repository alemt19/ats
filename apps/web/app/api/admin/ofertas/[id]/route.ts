import { NextResponse } from "next/server"

import { getAdminOfferDetailServer } from "../../../../admin/(public)/ofertas/[id]/offer-detail-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const offerId = Number(params.id)

  if (!Number.isFinite(offerId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 })
  }

  const detail = await getAdminOfferDetailServer(offerId)

  if (!detail) {
    return NextResponse.json({ message: "Oferta no encontrada" }, { status: 404 })
  }

  return NextResponse.json(detail)
}
