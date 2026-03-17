import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import CandidateApplicationDetailClient, {
	type ApplicationNote,
	type ApplicationStatusOption,
	type CandidateApplicationDetail,
	type CulturePreferenceCategory,
} from "./candidate-application-detail-client"

type CandidateDetailPageProps = {
	params: Promise<{ id: string; candidate_id: string }>
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

async function fetchCandidateDetailServer(
	offerId: number,
	applicationId: number,
	cookie?: string
): Promise<CandidateApplicationDetail> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	const response = await fetch(`${apiBaseUrl}/api/admin/ofertas/${offerId}/candidatos/${applicationId}`, {
		method: "GET",
		headers: {
			...(cookie ? { cookie } : {}),
		},
		cache: "no-store",
	})

	if (!response.ok) {
		throw new Error("No se pudo cargar el detalle del candidato")
	}

	const payload = (await response.json().catch(() => null)) as
		| CandidateApplicationDetail
		| { data?: CandidateApplicationDetail }
		| null

	const candidate = payload && typeof payload === "object" && "data" in payload ? payload.data : payload

	if (!candidate) {
		throw new Error("Respuesta inválida del backend")
	}

	return candidate as CandidateApplicationDetail
}

async function fetchApplicationNotesServer(
	applicationId: number,
	cookie?: string
): Promise<ApplicationNote[]> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	const response = await fetch(`${apiBaseUrl}/api/applications/${applicationId}/notes`, {
		method: "GET",
		headers: {
			...(cookie ? { cookie } : {}),
		},
		cache: "no-store",
	})

	if (!response.ok) {
		throw new Error("No se pudieron cargar las notas")
	}

	const payload = (await response.json().catch(() => null)) as
		| ApplicationNote[]
		| { data?: ApplicationNote[] }
		| null

	const notes = payload && typeof payload === "object" && "data" in payload ? payload.data : payload

	return Array.isArray(notes) ? notes : []
}

async function getApplicationStatusOptionsServer() {
	return readJsonFile<ApplicationStatusOption[]>("application_status.json")
}

async function getCulturePreferenceCatalogServer() {
	return readJsonFile<CulturePreferenceCategory[]>("culture_preference_candidate.json")
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
	const resolvedParams = await params
	const offerId = Number(resolvedParams.id)
	const applicationId = Number(resolvedParams.candidate_id)

	if (!Number.isFinite(offerId) || !Number.isFinite(applicationId)) {
		notFound()
	}

	const cookie = (await headers()).get("cookie") ?? undefined
	const behavioralQuestion1 =
		process.env.behavioral_question_1 ??
		"Cuéntame sobre una ocasión en la que tuviste que lidiar con un conflicto en un equipo. ¿Cuál fue la situación, cómo la manejaste y cuál fue el resultado?"
	const behavioralQuestion2 =
		process.env.behavioral_question_2 ??
		"Describe una situación en la que fallaste o cometiste un error importante. ¿Cómo reaccionaste y qué aprendiste de esa experiencia?"

	let candidate: CandidateApplicationDetail
	let initialNotes: ApplicationNote[]

	try {
		;[candidate, initialNotes] = await Promise.all([
			fetchCandidateDetailServer(offerId, applicationId, cookie),
			fetchApplicationNotesServer(applicationId, cookie),
		])
	} catch {
		notFound()
	}

	const [statusOptions, culturePreferenceCatalog] = await Promise.all([
		getApplicationStatusOptionsServer(),
		getCulturePreferenceCatalogServer(),
	])

	return (
		<CandidateApplicationDetailClient
			offerId={offerId}
			candidate={candidate}
			statusOptions={statusOptions}
			culturePreferenceCatalog={culturePreferenceCatalog}
			initialNotes={initialNotes}
			behavioralQuestion1={behavioralQuestion1}
			behavioralQuestion2={behavioralQuestion2}
		/>
	)
}
