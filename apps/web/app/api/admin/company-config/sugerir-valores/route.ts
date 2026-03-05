import { NextResponse } from "next/server"

type SuggestCompanyValuesRequest = {
	name?: string
	description?: string
	mision?: string
}

type SuggestCompanyValuesResponse = {
	values?: string[]
	message?: string
}

const fastapiApiUrl = process.env.FASTAPI_API_URL ?? "http://localhost:8000"

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
		const body = (await request.json()) as SuggestCompanyValuesRequest
		const name = body.name?.trim() ?? ""
		const description = body.description?.trim() ?? ""
		const mision = body.mision?.trim() ?? ""

		if (!name || !description || !mision) {
			return NextResponse.json(
				{ message: "Nombre, descripción y misión son obligatorios" },
				{ status: 400 }
			)
		}

		const response = await fetch(`${fastapiApiUrl}/api/company-values/suggest`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name, description, mision }),
			cache: "no-store",
		})

		const payload = (await response.json().catch(() => null)) as SuggestCompanyValuesResponse | null

		if (!response.ok) {
			const message = parseMessage(payload) ?? "No se pudieron sugerir valores"
			return NextResponse.json({ message }, { status: response.status })
		}

		return NextResponse.json({
			values: Array.isArray(payload?.values) ? payload.values : [],
		})
	} catch {
		return NextResponse.json({ message: "Error inesperado al sugerir valores" }, { status: 500 })
	}
}
