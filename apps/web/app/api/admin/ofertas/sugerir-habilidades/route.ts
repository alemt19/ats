import path from "node:path"
import { readFile } from "node:fs/promises"

import { NextResponse } from "next/server"

type SuggestionCase = {
  technical_skills: string[]
  soft_skills: string[]
  keywords: string[]
}

type SuggestionRequest = {
  title?: string
  description?: string
  position?: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function dedupe(values: string[]) {
  const unique = new Set<string>()

  values.forEach((value) => {
    const clean = value.trim()

    if (!clean) {
      return
    }

    unique.add(clean)
  })

  return Array.from(unique)
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SuggestionRequest
    const text = `${body.title ?? ""} ${body.description ?? ""} ${body.position ?? ""}`.toLowerCase()

    const cases = await readJsonFile<SuggestionCase[]>("job_skill_suggestions_dummy.json")

    const matchedCase =
      cases.find((item) => item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) ?? cases[0]

    await new Promise((resolve) => setTimeout(resolve, 900))

    return NextResponse.json({
      technical_skills: dedupe(matchedCase?.technical_skills ?? []),
      soft_skills: dedupe(matchedCase?.soft_skills ?? []),
    })
  } catch {
    return NextResponse.json(
      {
        technical_skills: ["TypeScript", "Node.js"],
        soft_skills: ["Comunicación", "Trabajo en equipo"],
      },
      { status: 200 }
    )
  }
}
