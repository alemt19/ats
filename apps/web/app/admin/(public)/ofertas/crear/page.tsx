import path from "node:path"
import { readFile } from "node:fs/promises"

import CrearOfertaForm, { type CrearOfertaCatalogs } from "./crear-oferta-form"

type JobParameterValue = {
	technical_name: string
	display_name: string
}

type JobParameter = {
	technical_name: string
	display_name: string
	values: JobParameterValue[]
}

type SkillsCatalog = {
	technical_skills: string[]
	soft_skills: string[]
}

type FixedLocationCatalog = {
	state: string
}

type StateItem = {
	id: string
	name: string
}

type CityItem = {
	id: string
	name: string
	state_id: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

function getParameterOptions(
	parameters: JobParameter[],
	key: "workplace_type" | "employment_type" | "status"
) {
	const entry = parameters.find((item) => item.technical_name === key)
	return entry?.values ?? []
}

async function fetchCreateOfferCatalogsServer(): Promise<CrearOfertaCatalogs> {
	try {
		const [parameters, categories, skillsCatalog, fixedLocation, states, cities] = await Promise.all([
			readJsonFile<JobParameter[]>("job_parameters.json"),
			readJsonFile<string[]>("job_categories_dummy.json"),
			readJsonFile<SkillsCatalog>("job_skills_catalog_dummy.json"),
			readJsonFile<FixedLocationCatalog>("job_location_fixed_dummy.json"),
			readJsonFile<StateItem[]>("state.json"),
			readJsonFile<CityItem[]>("city.json"),
		])

		const fixedStateId = states.find((state) => state.name === fixedLocation.state)?.id

		if (!fixedStateId) {
			throw new Error("No se encontró el estado fijo en el catálogo de estados")
		}

		const cityOptions = fixedStateId
			? Array.from(
					new Set(
						cities
							.filter((city) => city.state_id === fixedStateId)
							.map((city) => city.name.trim())
							.filter((cityName) => cityName.length > 0)
					)
			  ).sort((a, b) => a.localeCompare(b))
			: []

		if (cityOptions.length === 0) {
			throw new Error("No hay ciudades para el estado fijo")
		}

		return {
			statuses: getParameterOptions(parameters, "status"),
			workplaceTypes: getParameterOptions(parameters, "workplace_type"),
			employmentTypes: getParameterOptions(parameters, "employment_type"),
			categories,
			fixedLocation: {
				state: fixedLocation.state,
			},
			cityOptions,
			technicalSkillOptions: skillsCatalog.technical_skills,
			softSkillOptions: skillsCatalog.soft_skills,
		}
	} catch {
		return {
			statuses: [
				{ technical_name: "draft", display_name: "Borrador" },
				{ technical_name: "published", display_name: "Publicado" },
			],
			workplaceTypes: [
				{ technical_name: "onsite", display_name: "Presencial" },
				{ technical_name: "remote", display_name: "Remoto" },
			],
			employmentTypes: [
				{ technical_name: "full_time", display_name: "Tiempo completo" },
				{ technical_name: "contract", display_name: "Contrato" },
			],
			categories: ["Tecnología"],
			fixedLocation: {
				state: "Distrito Capital",
			},
			cityOptions: ["Caracas"],
			technicalSkillOptions: ["TypeScript", "React", "Node.js"],
			softSkillOptions: ["Comunicación", "Trabajo en equipo", "Resolución de problemas"],
		}
	}
}

export default async function CrearOfertaPage() {
	const catalogs = await fetchCreateOfferCatalogsServer()

	return <CrearOfertaForm catalogs={catalogs} />
}
