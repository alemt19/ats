import { NextResponse } from "next/server"

import { getAdminOfferCandidatesServer } from "../../../../../admin/(public)/ofertas/[id]/offer-detail-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const offerId = Number(params.id)

  if (!Number.isFinite(offerId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 })
  }

  const url = new URL(request.url)

  const data = await getAdminOfferCandidatesServer(offerId, {
    search: url.searchParams.get("search") ?? undefined,
    technical_min: url.searchParams.get("technical_min") ?? undefined,
    technical_max: url.searchParams.get("technical_max") ?? undefined,
    soft_min: url.searchParams.get("soft_min") ?? undefined,
    soft_max: url.searchParams.get("soft_max") ?? undefined,
    culture_min: url.searchParams.get("culture_min") ?? undefined,
    culture_max: url.searchParams.get("culture_max") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}
