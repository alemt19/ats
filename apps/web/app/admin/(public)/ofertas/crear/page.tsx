import path from "node:path"
import { readFile } from "node:fs/promises"
import Link from "next/link"
import { headers } from "next/headers"

import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { getAdminCategoriesServer } from "../../categorias/categories-admin-service"
import { getCompanyConfigServer } from "../../configuracion/company-config-service"
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

function getParameterOptions(
	parameters: JobParameter[],
	key: "workplace_type" | "employment_type" | "status"
) {
	const entry = parameters.find((item) => item.technical_name === key)
	return entry?.values ?? []
}

async function fetchCreateOfferCatalogsServer(input: {
	categories: string[]
	companyState: string
	companyCity: string
}): Promise<CrearOfertaCatalogs> {
	try {
		const [parameters, skillsCatalog] = await Promise.all([
			readJsonFile<JobParameter[]>("job_parameters.json"),
			readJsonFile<SkillsCatalog>("job_skills_catalog_dummy.json"),
		])

		return {
			statuses: getParameterOptions(parameters, "status"),
			workplaceTypes: getParameterOptions(parameters, "workplace_type"),
			employmentTypes: getParameterOptions(parameters, "employment_type"),
			categories: input.categories,
			fixedLocation: {
				state: input.companyState,
			},
			cityOptions: [input.companyCity],
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
	const cookie = (await headers()).get("cookie") ?? undefined

	const [companyConfigResult, categoriesResult] = await Promise.allSettled([
		getCompanyConfigServer(cookie),
		getAdminCategoriesServer({ page: 1, pageSize: 100 }, cookie),
	])

	const blockers: string[] = []
	let missingCompanyItems: string[] = []
	let categoryNames: string[] = []
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
		categoryNames = Array.from(
			new Set(
				categoriesResult.value.items
					.map((category) => category.name.trim())
					.filter((categoryName) => categoryName.length > 0)
			)
		).sort((a, b) => a.localeCompare(b))

		if (categoryNames.length === 0) {
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
		categories: categoryNames,
		companyState,
		companyCity,
	})

	return <CrearOfertaForm catalogs={catalogs} />
}
