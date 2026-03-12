import path from "node:path"
import { readFile } from "node:fs/promises"
import Link from "next/link"
import { headers } from "next/headers"

import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { getAdminCategoriesServer } from "../../categorias/categories-admin-service"
import { getCompanyConfigServer } from "../../configuracion/company-config-service"
import { getAdminOffersCatalogsServer } from "../offers-admin-service"
import CrearOfertaForm, { type CrearOfertaCatalogs } from "./crear-oferta-form"

type CategoryOption = {
	id: number
	name: string
}

type JobParameterValue = {
	technical_name: string
	display_name: string
}

type JobParameter = {
	technical_name: string
	display_name: string
	values: JobParameterValue[]
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

type PreferenceFieldName =
	| "dress_code"
	| "colaboration_style"
	| "work_pace"
	| "level_of_autonomy"
	| "dealing_with_management"
	| "level_of_monitoring"

type CompanyConfigData = Awaited<ReturnType<typeof getCompanyConfigServer>>

const requiredCompanyFields: Array<{ key: "country" | "state" | "city"; label: string }> = [
	{ key: "country", label: "Pais" },
	{ key: "state", label: "Estado" },
	{ key: "city", label: "Ciudad" },
]

const requiredPreferenceFields: Array<{ key: PreferenceFieldName; label: string }> = [
	{ key: "dress_code", label: "Codigo de vestimenta" },
	{ key: "colaboration_style", label: "Estilo de colaboracion" },
	{ key: "work_pace", label: "Ritmo de trabajo" },
	{ key: "level_of_autonomy", label: "Nivel de autonomia" },
	{ key: "dealing_with_management", label: "Relacion con la gerencia" },
	{ key: "level_of_monitoring", label: "Nivel de monitoreo" },
]

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

function hasText(value: unknown) {
	return typeof value === "string" && value.trim().length > 0
}

function getMissingCompanyConfigItems(companyConfig: CompanyConfigData) {
	const missing: string[] = []
	const { initialData } = companyConfig

	for (const field of requiredCompanyFields) {
		if (!hasText(initialData[field.key])) {
			missing.push(field.label)
		}
	}

	const configuredValues = Array.isArray(initialData.values)
		? initialData.values.filter((value) => hasText(value))
		: []

	if (configuredValues.length === 0) {
		missing.push("Valores")
	}

	for (const preference of requiredPreferenceFields) {
		if (!hasText(initialData.preferences?.[preference.key])) {
			missing.push(preference.label)
		}
	}

	return missing
}

async function fetchCreateOfferCatalogsServer(input: {
	categories: CategoryOption[]
	companyState: string
	companyCity: string
	stateOptions: string[]
	cityCatalogOptions: string[]
	technicalSkillOptions: string[]
	softSkillOptions: string[]
}): Promise<CrearOfertaCatalogs> {
	try {
		const normalizedState = input.companyState.trim()
		const normalizedCity = input.companyCity.trim()
		const fallbackState = input.stateOptions.find((state) => state.trim().length > 0)?.trim() ?? ""
		const resolvedState = normalizedState || fallbackState

		const [parameters, states, cities] = await Promise.all([
			readJsonFile<JobParameter[]>("job_parameters.json"),
			readJsonFile<StateItem[]>("state.json"),
			readJsonFile<CityItem[]>("city.json"),
		])

		const fixedStateId = states.find((state) => state.name.trim() === resolvedState)?.id
		const stateOptions =
			input.stateOptions.length > 0
				? input.stateOptions
				: states.map((state) => state.name.trim()).filter((stateName) => stateName.length > 0)

		const citiesByState = fixedStateId
			? cities.filter((city) => city.state_id === fixedStateId).map((city) => city.name.trim())
			: []

		const fallbackCity = input.cityCatalogOptions.find((city) => city.trim().length > 0)?.trim() ?? ""
		const resolvedCity = normalizedCity || fallbackCity

		const cityOptions = Array.from(
			new Set(
				[...citiesByState, ...input.cityCatalogOptions, resolvedCity]
					.map((cityName) => cityName.trim())
					.filter((cityName) => cityName.length > 0)
			)
		).sort((a, b) => a.localeCompare(b))

		return {
			statuses:
				parameters.find((item) => item.technical_name === "status")?.values ?? [],
			workplaceTypes:
				parameters.find((item) => item.technical_name === "workplace_type")?.values ?? [],
			employmentTypes:
				parameters.find((item) => item.technical_name === "employment_type")?.values ?? [],
			categories: input.categories,
			stateOptions,
			fixedLocation: {
				state: resolvedState,
			},
			cityOptions,
			technicalSkillOptions: input.technicalSkillOptions,
			softSkillOptions: input.softSkillOptions,
		}
	} catch {
		const normalizedState = input.companyState.trim()
		const normalizedCity = input.companyCity.trim()
		const fallbackState = input.stateOptions.find((state) => state.trim().length > 0)?.trim() ?? ""
		const fallbackCity = input.cityCatalogOptions.find((city) => city.trim().length > 0)?.trim() ?? ""

		return {
			statuses: [
				{ technical_name: "draft", display_name: "Borrador" },
				{ technical_name: "published", display_name: "Publicado" },
				{ technical_name: "closed", display_name: "Cerrado" },
				{ technical_name: "archived", display_name: "Archivado" },
			],
			workplaceTypes: [
				{ technical_name: "onsite", display_name: "Presencial" },
				{ technical_name: "remote", display_name: "Remoto" },
				{ technical_name: "hybrid", display_name: "Híbrido" },
			],
			employmentTypes: [
				{ technical_name: "full_time", display_name: "Tiempo completo" },
				{ technical_name: "part_time", display_name: "Medio tiempo" },
				{ technical_name: "contract", display_name: "Contrato" },
				{ technical_name: "internship", display_name: "Pasantía" },
			],
			categories: input.categories.length > 0 ? input.categories : [{ id: 1, name: "Tecnología" }],
			stateOptions:
				input.stateOptions.length > 0 ? input.stateOptions : [normalizedState || fallbackState || "Distrito Capital"],
			fixedLocation: {
				state: normalizedState || fallbackState || "Distrito Capital",
			},
			cityOptions: Array.from(
				new Set([normalizedCity, fallbackCity, "Caracas"].filter((city) => city.trim().length > 0))
			),
			technicalSkillOptions:
				input.technicalSkillOptions.length > 0
					? input.technicalSkillOptions
					: ["TypeScript", "React", "Node.js"],
			softSkillOptions:
				input.softSkillOptions.length > 0
					? input.softSkillOptions
					: ["Comunicación", "Trabajo en equipo", "Resolución de problemas"],
		}
	}
}

export default async function CrearOfertaPage() {
	const cookie = (await headers()).get("cookie") ?? undefined

	const [companyConfigResult, categoriesResult, offersCatalogsResult] = await Promise.allSettled([
		getCompanyConfigServer(cookie),
		getAdminCategoriesServer({ page: 1, pageSize: 100 }, cookie),
		getAdminOffersCatalogsServer(cookie),
	])

	const blockers: string[] = []
	let missingCompanyItems: string[] = []
	let categoryOptions: CategoryOption[] = []
	let companyState = ""
	let companyCity = ""

	if (companyConfigResult.status === "fulfilled") {
		missingCompanyItems = getMissingCompanyConfigItems(companyConfigResult.value)
		companyState = companyConfigResult.value.initialData.state
		companyCity = companyConfigResult.value.initialData.city

		if (missingCompanyItems.length > 0) {
			blockers.push("Configuracion de empresa incompleta")
		}
	} else {
		const reason = companyConfigResult.reason
		if (reason instanceof Error) {
			blockers.push(`No se pudo validar la configuracion de la empresa: ${reason.message}`)
		} else {
			blockers.push("No se pudo validar la configuracion de la empresa")
		}
	}

	if (categoriesResult.status === "fulfilled") {
		categoryOptions = categoriesResult.value.items
			.map((category) => ({
				id: category.id,
				name: category.name.trim(),
			}))
			.filter((category) => Number.isFinite(category.id) && category.id > 0 && category.name.length > 0)
			.sort((a, b) => a.name.localeCompare(b.name))

		if (categoryOptions.length === 0) {
			blockers.push("Debe existir al menos una categoria")
		}
	} else {
		const reason = categoriesResult.reason
		if (reason instanceof Error) {
			blockers.push(`No se pudieron validar las categorias: ${reason.message}`)
		} else {
			blockers.push("No se pudieron validar las categorias")
		}
	}

	let statuses: Array<{ technical_name: string; display_name: string }> = []
	let stateOptions: string[] = []
	let cityCatalogOptions: string[] = []
	let technicalSkillOptions: string[] = []
	let softSkillOptions: string[] = []

	if (offersCatalogsResult.status === "fulfilled") {
		statuses = offersCatalogsResult.value.statuses
		stateOptions = offersCatalogsResult.value.states
		cityCatalogOptions = offersCatalogsResult.value.cities
		technicalSkillOptions = offersCatalogsResult.value.technical_skills
		softSkillOptions = offersCatalogsResult.value.soft_skills
	} else {
		const reason = offersCatalogsResult.reason
		if (reason instanceof Error) {
			blockers.push(`No se pudieron cargar los catalogos de oferta: ${reason.message}`)
		} else {
			blockers.push("No se pudieron cargar los catalogos de oferta")
		}
	}

	if (blockers.length > 0) {
		return (
			<section className="mx-auto w-full max-w-5xl space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Crear oferta de trabajo</h1>
					<p className="text-sm text-muted-foreground">
						No se puede crear la oferta porque falta completar la configuracion requerida.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Configuracion pendiente</CardTitle>
						<CardDescription>
							Debes completar la configuracion de la empresa y categorias antes de crear ofertas.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						{missingCompanyItems.length > 0 ? (
							<div className="space-y-2">
								<p className="font-medium">Faltan los siguientes parametros de la empresa:</p>
								<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
									{missingCompanyItems.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</div>
						) : null}

						{blockers.includes("Debe existir al menos una categoria") ? (
							<p className="text-muted-foreground">
								Debe existir minimo una categoria creada para poder publicar ofertas.
							</p>
						) : null}

						{blockers
							.filter(
								(blocker) =>
									blocker !== "Configuracion de empresa incompleta" &&
									blocker !== "Debe existir al menos una categoria"
							)
							.map((blocker) => (
								<p key={blocker} className="text-destructive">
									{blocker}
								</p>
							))}

						<div className="flex flex-wrap gap-2 pt-2">
							<Button asChild variant="outline">
								<Link href="/admin/configuracion">Ir a configuracion</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/admin/categorias">Ir a categorias</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
		)
	}

	const catalogs = await fetchCreateOfferCatalogsServer({
		categories: categoryOptions,
		companyState: companyState.trim(),
		companyCity: companyCity.trim(),
		stateOptions,
		cityCatalogOptions,
		technicalSkillOptions,
		softSkillOptions,
	})

	return <CrearOfertaForm catalogs={catalogs} />
}
