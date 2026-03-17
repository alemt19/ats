import path from "node:path"
import { readFile } from "node:fs/promises"
import { notFound } from "next/navigation"

import CandidateDetailReadonly from "../candidate-detail-readonly"
import {
	getCandidateApplicationsByIdServer,
	getCandidateByIdServer,
} from "../candidates-admin-service"

type CulturePreferenceValue = {
	technical_name: string
	display_name: string
	description: string
}

type CulturePreferenceCategory = {
	technical_name: string
	display_name: string
	values: CulturePreferenceValue[]
}

type AdminCandidatoDetallePageProps = {
	params: Promise<{ id: string }>
}

type ApplicationStatusCatalogItem = {
	technical_name: string
	display_name: string
}

type RawStatusCatalogItem = {
	technical_name?: string
	techical_name?: string
	display_name: string
}

function normalizeStatusCatalog(
	rawCatalog: RawStatusCatalogItem[]
): ApplicationStatusCatalogItem[] {
	return rawCatalog
		.map((item) => ({
			technical_name: item.technical_name ?? item.techical_name ?? "",
			display_name: item.display_name,
		}))
		.filter((item) => item.technical_name.length > 0)
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

export default async function AdminCandidatoDetallePage({ params }: AdminCandidatoDetallePageProps) {
	const resolvedParams = await params
	const candidateId = Number(resolvedParams.id)

	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		notFound()
	}

	const [candidate, candidateApplications, culturePreferenceCatalog, statusCatalogRaw] = await Promise.all([
		getCandidateByIdServer(candidateId),
		getCandidateApplicationsByIdServer(candidateId),
		readJsonFile<CulturePreferenceCategory[]>("culture_preference_candidate.json").catch(() => []),
		readJsonFile<RawStatusCatalogItem[]>("application_status.json").catch(() => []),
	])

	if (!candidate) {
		notFound()
	}

	const behavioralQuestion1 =
		process.env.behavioral_question_1 ??
		"Cuéntame sobre una ocasión en la que tuviste que lidiar con un conflicto en un equipo. ¿Cuál fue la situación, cómo la manejaste y cuál fue el resultado?"
	const behavioralQuestion2 =
		process.env.behavioral_question_2 ??
		"Describe una situación en la que fallaste o cometiste un error importante. ¿Cómo reaccionaste y qué aprendiste de esa experiencia?"

	const statusCatalog = normalizeStatusCatalog(statusCatalogRaw)

	return (
		<CandidateDetailReadonly
			candidate={candidate}
			applications={candidateApplications}
			statusCatalog={statusCatalog}
			culturalPreferenceCatalog={culturePreferenceCatalog}
			behavioralQuestion1={behavioralQuestion1}
			behavioralQuestion2={behavioralQuestion2}
		/>
	)
}
