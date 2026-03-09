import { Suspense } from "react"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"

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


async function fetchApplicationsServer(
	cookie: string
): Promise<JobApplication[]> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/applications/me`, {
			method: "GET",
			headers: {
				cookie,
			},
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as JobApplication[]
		}
	} catch {
		// Fallback to empty list if backend is unavailable.
	}

	return []
}

async function PostulacionesData() {
	const cookie = (await headers()).get("cookie") ?? ""

	const [applications, statusCatalogRaw] = await Promise.all([
		fetchApplicationsServer(cookie),
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
