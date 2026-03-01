import { NextResponse } from "next/server"

import { refreshAdminOfferCandidatesServer } from "../../../../../../admin/(public)/ofertas/[id]/offer-detail-admin-service"
import { type AdminOfferCandidatesQueryParams } from "../../../../../../admin/(public)/ofertas/[id]/offer-detail-admin-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const offerId = Number(params.id)

  if (!Number.isFinite(offerId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 })
  }

  const body = (await request.json()) as Partial<AdminOfferCandidatesQueryParams>

  const data = await refreshAdminOfferCandidatesServer(offerId, body)

  return NextResponse.json(data)
}
