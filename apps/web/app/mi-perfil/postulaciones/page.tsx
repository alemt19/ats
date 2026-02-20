import { Suspense } from "react"

import { auth } from "../../../auth"
import PostulacionesList, { type JobApplication } from "./postulaciones-list"
import PostulacionesShell from "./postulaciones-shell"
import PostulacionesSkeleton from "./postulaciones-skeleton"

const applicationsDummy: JobApplication[] = [
	{
		id: 1,
		title: "Desarrollador Full-Stack",
		category: "Tecnologia",
		city: "Caracas",
		state: "Distrito Capital",
		position: "Programador",
		salary: 700,
		status: "pending",
	},
	{
		id: 2,
		title: "Especialista en Marketing Digital",
		category: "Marketing",
		city: "Valencia",
		state: "Carabobo",
		position: "Analista",
		salary: 600,
		status: "interview",
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
		status: "accepted",
	},
	{
		id: 5,
		title: "Analista de Datos",
		category: "Datos",
		city: "Barquisimeto",
		state: "Lara",
		position: "Analista",
		salary: 900,
		status: "in_review",
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

	const applications = await fetchApplicationsServer(userId, accessToken)

	return <PostulacionesList applications={applications} />
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
