import { NextResponse } from "next/server"

const fastapiApiUrl = process.env.FASTAPI_API_URL ?? "http://localhost:8000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message
  }

  return null
}

export async function POST(request: Request) {
  try {
    const incomingFormData = await request.formData()
    const outgoingFormData = new FormData()

    for (const [key, value] of incomingFormData.entries()) {
      outgoingFormData.append(key, value)
    }

    const response = await fetch(`${fastapiApiUrl}/api/candidates/suggest-skills-values`, {
      method: "POST",
      body: outgoingFormData,
      cache: "no-store",
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message = extractErrorMessage(payload) ?? "No se pudieron generar sugerencias"
      return NextResponse.json({ message }, { status: response.status })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(
      { message: "Error inesperado al generar sugerencias" },
      { status: 500 }
    )
  }
}
