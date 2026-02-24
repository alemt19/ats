import path from "node:path"
import { readFile } from "node:fs/promises"

export type CountryRecord = {
	id: string
	name: string
}

export type StateRecord = {
	id: string
	name: string
	country_id: string
}

export type CityRecord = {
	id: string
	name: string
	state_id: string
}

export type CulturePreferenceOption = {
	technical_name: string
	display_name: string
	description: string
}

export type CulturePreferenceCategory = {
	technical_name: string
	display_name: string
	values: CulturePreferenceOption[]
}

export type PreferenceFieldName =
	| "dress_code"
	| "colaboration_style"
	| "work_pace"
	| "level_of_autonomy"
	| "dealing_with_management"
	| "level_of_monitoring"

export type AdminCompanyConfigInitialData = {
	name: string
	logo: string
	contact_email: string
	country: string
	state: string
	city: string
	address: string
	description: string
	mision: string
	values: string[]
	preferences: Partial<Record<PreferenceFieldName, string>>
}

export type CompanyConfigBootstrapData = {
	initialData: AdminCompanyConfigInitialData
	companyValueOptions: string[]
}

export const FIXED_COUNTRY_NAME = "Venezuela"
export const FIXED_STATE_NAME = "Carabobo"

const FALLBACK_VALUE_OPTIONS = [
	"Responsabilidad",
	"Integridad",
	"Colaboración",
	"Innovación",
	"Respeto",
	"Empatía",
	"Excelencia",
	"Compromiso",
	"Transparencia",
]

export async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

export async function fetchCompanyConfigBootstrap(
	userId: string,
	accessToken?: string
): Promise<CompanyConfigBootstrapData> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/admin/company-config`, {
			method: "GET",
			headers: {
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				"x-user-id": userId,
			},
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as CompanyConfigBootstrapData
		}
	} catch {
		// Fallback to dummyjson while backend endpoint is not implemented.
	}

	const [dummyUserResponse, dummyPostResponse] = await Promise.all([
		fetch("https://dummyjson.com/users/1", { cache: "no-store" }),
		fetch("https://dummyjson.com/posts/1", { cache: "no-store" }),
	])

	const dummyUser = dummyUserResponse.ok
		? ((await dummyUserResponse.json()) as {
				company?: { name?: string; title?: string; department?: string }
				image?: string
				email?: string
				address?: { city?: string; address?: string }
			})
		: undefined

	const dummyPost = dummyPostResponse.ok
		? ((await dummyPostResponse.json()) as { body?: string; title?: string })
		: undefined

	const fallbackData: AdminCompanyConfigInitialData = {
		name: dummyUser?.company?.name ?? "Empresa Demo ATS",
		logo: dummyUser?.image ?? "",
		contact_email: dummyUser?.email ?? "contacto@empresa-demo.com",
		country: FIXED_COUNTRY_NAME,
		state: FIXED_STATE_NAME,
		city: "Valencia",
		address: dummyUser?.address?.address ?? "Av. Principal, Torre Empresarial",
		description:
			dummyPost?.body ??
			"Empresa enfocada en atraer talento, acelerar procesos de selección y mejorar la experiencia de candidatos.",
		mision:
			dummyPost?.title ??
			"Conectar empresas con talento alineado cultural y técnicamente para potenciar su crecimiento.",
		values: ["Responsabilidad", "Integridad", "Colaboración"],
		preferences: {
			dress_code: "casual",
			colaboration_style: "mixed",
			work_pace: "moderate",
			level_of_autonomy: "balanced",
			dealing_with_management: "friendly_and_approachable",
			level_of_monitoring: "weekly_goals",
		},
	}

	return {
		initialData: fallbackData,
		companyValueOptions: FALLBACK_VALUE_OPTIONS,
	}
}

export function getFixedCityOptions(countries: CountryRecord[], states: StateRecord[], cities: CityRecord[]) {
	const fixedCountry = countries.find((country) => country.name === FIXED_COUNTRY_NAME)
	const fixedState = states.find(
		(state) => state.name === FIXED_STATE_NAME && state.country_id === fixedCountry?.id
	)

	return cities
		.filter((city) => city.state_id === fixedState?.id)
		.map((city) => city.name)
		.sort((a, b) => a.localeCompare(b, "es"))
}
