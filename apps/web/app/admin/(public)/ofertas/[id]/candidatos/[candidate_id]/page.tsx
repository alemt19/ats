import path from "node:path"
import { readFile } from "node:fs/promises"
import { notFound } from "next/navigation"

import { getSession } from "../../../../../../../auth"
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
	accessToken?: string
): Promise<CandidateApplicationDetail> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(
			`${apiBaseUrl}/admin/ofertas/${offerId}/candidatos/${applicationId}`,
			{
				method: "GET",
				headers: {
					...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				},
				cache: "no-store",
			}
		)

		if (response.ok) {
			return (await response.json()) as CandidateApplicationDetail
		}
	} catch {
		// Fallback while endpoint is pending on backend.
	}

	const fallback = await readJsonFile<CandidateApplicationDetail>(
		"candidate_application_detail_dummy.json"
	)

	return {
		...fallback,
		application_id: applicationId,
	}
}

async function fetchApplicationNotesServer(
	applicationId: number,
	accessToken?: string
): Promise<ApplicationNote[]> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/applications/${applicationId}/notes`, {
			method: "GET",
			headers: {
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
			},
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as ApplicationNote[]
		}
	} catch {
		// Fallback while endpoint is pending on backend.
	}

	return readJsonFile<ApplicationNote[]>("application_notes_dummy.json")
}

async function getApplicationStatusOptionsServer() {
	return readJsonFile<ApplicationStatusOption[]>("application_status.json")
}

async function getCulturePreferenceCatalogServer() {
	return readJsonFile<CulturePreferenceCategory[]>("culture_preference.json")
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
	const resolvedParams = await params
	const offerId = Number(resolvedParams.id)
	const applicationId = Number(resolvedParams.candidate_id)

	if (!Number.isFinite(offerId) || !Number.isFinite(applicationId)) {
		notFound()
	}

	const session = await getSession()
	const accessToken = session?.accessToken
	const behavioralQuestion1 =
		process.env.behavioral_question_1 ??
		"Cuéntame sobre una ocasión en la que tuviste que lidiar con un conflicto en un equipo. ¿Cuál fue la situación, cómo la manejaste y cuál fue el resultado?"
	const behavioralQuestion2 =
		process.env.behavioral_question_2 ??
		"Describe una situación en la que fallaste o cometiste un error importante. ¿Cómo reaccionaste y qué aprendiste de esa experiencia?"

	const [candidate, statusOptions, culturePreferenceCatalog, initialNotes] = await Promise.all([
		fetchCandidateDetailServer(offerId, applicationId, accessToken),
		getApplicationStatusOptionsServer(),
		getCulturePreferenceCatalogServer(),
		fetchApplicationNotesServer(applicationId, accessToken),
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
			currentUser={{
				id: session?.user?.id ?? "admin_1",
				displayName: session?.user?.email ?? "Administrador",
			}}
		/>
	)
}
