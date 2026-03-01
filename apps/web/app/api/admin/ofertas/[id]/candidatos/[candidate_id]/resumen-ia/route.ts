import path from "node:path"
import { readFile } from "node:fs/promises"
import { NextResponse } from "next/server"

type SummaryDummyResponse = {
  ok?: boolean
  summary?: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      offerId?: number
      candidateId?: number
    }

    if (!body.offerId || !body.candidateId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Faltan identificadores para generar el resumen.",
        },
        { status: 400 }
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 1200))

    const dummy = await readJsonFile<SummaryDummyResponse>("candidate_ai_summary_dummy.json")

    if (!dummy.ok || !dummy.summary) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo generar el resumen.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      summary: dummy.summary,
      offerId: body.offerId,
      candidateId: body.candidateId,
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al generar el resumen.",
      },
      { status: 500 }
    )
  }
}
