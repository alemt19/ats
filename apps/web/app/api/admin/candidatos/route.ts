import { NextResponse } from "next/server"

import { getCandidatesServer } from "../../../admin/(public)/candidatos/candidates-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)

  const data = await getCandidatesServer({
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  })

  return NextResponse.json(data)
}
