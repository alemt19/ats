import path from "node:path"
import { readFile } from "node:fs/promises"
import { notFound } from "next/navigation"

import CandidateDetailReadonly from "../candidate-detail-readonly"
import { getCandidateByIdServer } from "../candidates-admin-service"

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

	const [candidate, culturePreferenceCatalog] = await Promise.all([
		getCandidateByIdServer(candidateId),
		readJsonFile<CulturePreferenceCategory[]>("culture_preference.json").catch(() => []),
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

	return (
		<CandidateDetailReadonly
			candidate={candidate}
			culturalPreferenceCatalog={culturePreferenceCatalog}
			behavioralQuestion1={behavioralQuestion1}
			behavioralQuestion2={behavioralQuestion2}
		/>
	)
}
