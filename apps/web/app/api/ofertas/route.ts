import { NextResponse } from "next/server"

import { getOffersServer } from "../../(public)/ofertas/offers-service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const data = await getOffersServer({
    title: searchParams.get("title") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    workplace_type: searchParams.get("workplace_type") ?? undefined,
    employment_type: searchParams.get("employment_type") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}
