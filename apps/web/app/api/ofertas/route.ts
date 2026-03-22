import { NextResponse } from "next/server"

import { getOffersServer } from "../../(public)/ofertas/offers-service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cookieHeader = request.headers.get("cookie") ?? undefined

  try {
    const data = await getOffersServer({
      title: searchParams.get("title") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      workplace_type: searchParams.get("workplace_type") ?? undefined,
      employment_type: searchParams.get("employment_type") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    }, {
      cookieHeader,
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: "No se pudieron cargar las ofertas" },
      { status: 502 }
    )
  }
}
