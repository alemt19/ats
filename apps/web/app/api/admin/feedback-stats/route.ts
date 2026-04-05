import { NextResponse } from "next/server"
import { headers } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const cookie = (await headers()).get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/applications/admin/feedback-stats`, {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    return NextResponse.json({ employer: null, candidate: null })
  }

  const payload = await response.json().catch(() => null)
  return NextResponse.json(payload ?? { employer: null, candidate: null })
}
