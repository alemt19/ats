import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid analytics payload" }, { status: 400 })
  }

  // Temporary sink for UX analytics instrumentation until external provider wiring.
  console.info("[analytics-event]", payload)

  return NextResponse.json({ ok: true })
}
