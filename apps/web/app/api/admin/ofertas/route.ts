import { NextResponse } from "next/server"

import { getAdminOffersServer } from "../../../admin/(public)/ofertas/offers-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)

  const data = await getAdminOffersServer({
    title: url.searchParams.get("title") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    workplace_type: url.searchParams.get("workplace_type") ?? undefined,
    employment_type: url.searchParams.get("employment_type") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}
