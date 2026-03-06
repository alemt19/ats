import { NextResponse } from "next/server"

const fastapiApiUrl = process.env.FASTAPI_API_URL ?? "http://localhost:8000"

type SuggestionRequest = {
  title?: string
  description?: string
  position?: string
}

type SuggestionResponse = {
  technical_skills?: string[]
  soft_skills?: string[]
  message?: string
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseMessage(payload: unknown): string | null {
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
    const body = (await request.json()) as SuggestionRequest
    const title = body.title?.trim() ?? ""
    const position = body.position?.trim() ?? ""
    const description = body.description?.trim() ?? ""

    if (!title || !position || !description) {
      return NextResponse.json(
        { message: "Titulo, puesto y descripcion son obligatorios" },
        { status: 400 }
      )
    }

    const response = await fetch(`${fastapiApiUrl}/api/jobs/suggest-skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        puesto: position,
        description,
      }),
      cache: "no-store",
    })

    const payload = (await response.json().catch(() => null)) as SuggestionResponse | null

    if (!response.ok) {
      const message = parseMessage(payload) ?? "No se pudo obtener sugerencias"
      return NextResponse.json({ message }, { status: response.status })
    }

    return NextResponse.json({
      technical_skills: Array.isArray(payload?.technical_skills) ? payload.technical_skills : [],
      soft_skills: Array.isArray(payload?.soft_skills) ? payload.soft_skills : [],
    })
  } catch {
    return NextResponse.json({ message: "Error inesperado al sugerir habilidades" }, { status: 500 })
  }
}
