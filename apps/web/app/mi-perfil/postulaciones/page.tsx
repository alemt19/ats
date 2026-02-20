import { Suspense } from "react"
import path from "node:path"
import { readFile } from "node:fs/promises"

import { auth } from "../../../auth"
import PostulacionesList, {
	type ApplicationStatusCatalogItem,
	type JobApplication,
} from "./postulaciones-list"
import PostulacionesShell from "./postulaciones-shell"
import PostulacionesSkeleton from "./postulaciones-skeleton"

type RawStatusCatalogItem = {
	technical_name?: string
	techical_name?: string
	display_name: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
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

const applicationsDummy: JobApplication[] = [
	{
		id: 1,
		title: "Desarrollador Full-Stack",
		category: "Tecnologia",
		city: "Caracas",
		state: "Distrito Capital",
		position: "Programador",
		salary: 700,
		status: "applied",
	},
	{
		id: 2,
		title: "Especialista en Marketing Digital",
		category: "Marketing",
		city: "Valencia",
		state: "Carabobo",
		position: "Analista",
		salary: 600,
		status: "contacted",
	},
	{
		id: 3,
		title: "Gerente de Ventas",
		category: "Comercial",
		city: "Maracaibo",
		state: "Zulia",
		position: "Lider de area",
		salary: 1500,
		status: "rejected",
	},
	{
		id: 4,
		title: "Product Manager",
		category: "Tecnologia",
		city: "Maracay",
		state: "Aragua",
		position: "Product Manager",
		salary: 1200,
		status: "applied",
	},
	{
		id: 5,
		title: "Analista de Datos",
		category: "Datos",
		city: "Barquisimeto",
		state: "Lara",
		position: "Analista",
		salary: 900,
		status: "contacted",
	},
]

async function fetchApplicationsServer(
	userId: string,
	accessToken?: string
): Promise<JobApplication[]> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/applications/me`, {
			method: "GET",
			headers: {
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				"x-user-id": userId,
			},
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as JobApplication[]
		}
	} catch {
		// Fallback to mock data while backend endpoint is not implemented.
	}

	await new Promise((resolve) => setTimeout(resolve, 1500))
	return applicationsDummy
}

async function PostulacionesData() {
	const session = await auth()
	const userId = session?.user?.id ?? "user_123"
	const accessToken = session?.accessToken

	const [applications, statusCatalogRaw] = await Promise.all([
		fetchApplicationsServer(userId, accessToken),
		readJsonFile<RawStatusCatalogItem[]>("application_status.json"),
	])

	const statusCatalog = normalizeStatusCatalog(statusCatalogRaw)

	return (
		<PostulacionesList
			applications={applications}
			statusCatalog={statusCatalog}
		/>
	)
}

export default function PostulacionesPage() {
	return (
		<section className="mx-auto w-full max-w-6xl space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Postulaciones</h1>
				<p className="text-sm text-muted-foreground">
					Revisa el estado de tus aplicaciones activas y filtra las oportunidades.
				</p>
			</div>

			<PostulacionesShell>
				<Suspense fallback={<PostulacionesSkeleton />}>
					<PostulacionesData />
				</Suspense>
			</PostulacionesShell>
		</section>
	)
}
