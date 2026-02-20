import path from "node:path"
import { readFile } from "node:fs/promises"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, Wallet } from "lucide-react"

import { auth } from "../../../../auth"
import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "react/components/ui/card"
import { Separator } from "react/components/ui/separator"
import PostularseButton from "./postularse-button"

type OfferParameterValue = {
	technical_name: string
	display_name: string
}

type OfferParameter = {
	technical_name: string
	display_name: string
	values: OfferParameterValue[]
}

type ApplicationStatusItem = {
	technical_name?: string
	techical_name?: string
	display_name: string
}

type JobOfferDetail = {
	id: number
	title: string
	description: string
	city: string
	state: string
	address: string
	workplace_type: string
	employment_type: string
	position: string
	salary: number | string
	updated_at: string
}

type ApplicationInfoResponse = {
	alreadyApplied: boolean
	statusTechnicalName?: string
}

type OfertasDetailPageProps = {
	params: Promise<{ id: string }>
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
	const fullPath = path.join(process.cwd(), "public", "data", relativePath)
	const fileContents = await readFile(fullPath, "utf-8")
	return JSON.parse(fileContents) as T
}

function getMappedLabel(
	parameters: OfferParameter[],
	parameterKey: "workplace_type" | "employment_type",
	technicalName: string
) {
	const parameter = parameters.find((item) => item.technical_name === parameterKey)
	const option = parameter?.values.find((value) => value.technical_name === technicalName)
	return option?.display_name ?? technicalName
}

function buildStatusMap(statusItems: ApplicationStatusItem[]) {
	return new Map(
		statusItems
			.map((item) => ({
				technical_name: item.technical_name ?? item.techical_name ?? "",
				display_name: item.display_name,
			}))
			.filter((item) => item.technical_name.length > 0)
			.map((item) => [item.technical_name, item.display_name])
	)
}

async function fetchOfferDetailServer(offerId: number): Promise<JobOfferDetail | null> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/jobs/${offerId}`, {
			method: "GET",
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as JobOfferDetail
		}
	} catch {
		// Fallback to mock data while backend endpoint is not implemented.
	}
    // delay de 500ms to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500))
	const offers = await readJsonFile<
		Array<{
			id: number
			title: string
			city: string
			state: string
			position: string
			salary: number
			workplace_type: string
			employment_type: string
		}>
	>("job_offers_dummy.json")

	const offer = offers.find((item) => item.id === offerId)

	if (!offer) {
		return null
	}

	return {
		id: offer.id,
		title: offer.title,
		description:
			"Estamos buscando una persona comprometida que quiera crecer con el equipo y aportar con ideas para mejorar continuamente los resultados del área.",
		city: offer.city,
		state: offer.state,
		address: "Av. Principal, Torre Empresarial, Piso 4",
		workplace_type: offer.workplace_type,
		employment_type: offer.employment_type,
		position: offer.position,
		salary: offer.salary,
		updated_at: new Date(Date.now() - offer.id * 86_400_000).toISOString(),
	}
}

async function fetchApplicationInfoServer(
	userId: string,
	offerId: number,
	accessToken?: string
): Promise<ApplicationInfoResponse> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

	try {
		const response = await fetch(`${apiBaseUrl}/applications/me/${offerId}`, {
			method: "GET",
			headers: {
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				"x-user-id": userId,
			},
			cache: "no-store",
		})

		if (response.ok) {
			return (await response.json()) as ApplicationInfoResponse
		}
	} catch {
		// Fallback to mock data while backend endpoint is not implemented.
	}

	const dummyAppliedByOffer: Record<number, string> = {
		1: "applied",
		3: "contacted",
		8: "rejected",
	}

	const statusTechnicalName = userId ? dummyAppliedByOffer[offerId] : undefined

	return {
		alreadyApplied: Boolean(statusTechnicalName),
		statusTechnicalName,
        // alreadyApplied: true,
		// statusTechnicalName: 'contacted',
	}
}

function formatPublishedDate(value: string) {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return "Fecha no disponible"
	}

	return new Intl.DateTimeFormat("es-VE", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date)
}

export default async function OfertaDetallePage({ params }: OfertasDetailPageProps) {
	const resolvedParams = await params
	const offerId = Number(resolvedParams.id)

	if (!Number.isFinite(offerId)) {
		notFound()
	}

	const session = await auth()
	const userId = session?.user?.id ?? ""
	const accessToken = session?.accessToken

	const [offerDetail, jobParameters, applicationStatusItems, applicationInfo] =
		await Promise.all([
			fetchOfferDetailServer(offerId),
			readJsonFile<OfferParameter[]>("job_parameters.json"),
			readJsonFile<ApplicationStatusItem[]>("application_status.json"),
			fetchApplicationInfoServer(userId, offerId, accessToken),
		])

	if (!offerDetail) {
		notFound()
	}

	const statusMap = buildStatusMap(applicationStatusItems)
	const appliedStatusDisplayName = statusMap.get("applied") ?? "Postulado"
	const currentStatusDisplayName = applicationInfo.statusTechnicalName
		? statusMap.get(applicationInfo.statusTechnicalName)
		: undefined

	const workplaceTypeLabel = getMappedLabel(
		jobParameters,
		"workplace_type",
		offerDetail.workplace_type
	)
	const employmentTypeLabel = getMappedLabel(
		jobParameters,
		"employment_type",
		offerDetail.employment_type
	)

	return (
		<section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
			<div>
				<Button asChild variant="ghost" className="-ml-2">
					<Link href="/ofertas">
						<ArrowLeft className="size-4" />
						Volver atrás
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{workplaceTypeLabel}</Badge>
						<Badge variant="secondary">{employmentTypeLabel}</Badge>
					</div>
					<CardTitle className="text-2xl">{offerDetail.title}</CardTitle>
				</CardHeader>

				<CardContent className="space-y-6">
					<p className="text-sm leading-relaxed text-muted-foreground">
						{offerDetail.description}
					</p>

					<Separator />

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<MapPin className="size-4" />
							<span>
								{offerDetail.city}, {offerDetail.state}
							</span>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<BriefcaseBusiness className="size-4" />
							<span>{offerDetail.position}</span>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
							<MapPin className="size-4" />
							<span>{offerDetail.address}</span>
						</p>
						<p className="flex items-center gap-2 text-sm font-semibold">
							<Wallet className="size-4" />
							<span>${offerDetail.salary} / mes</span>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<CalendarDays className="size-4" />
							<span>Publicado: {formatPublishedDate(offerDetail.updated_at)}</span>
						</p>
					</div>

					<Separator />

					<PostularseButton
						isLoggedIn={Boolean(session?.user?.id)}
						alreadyApplied={applicationInfo.alreadyApplied}
						initialStatusTechnicalName={applicationInfo.statusTechnicalName}
						initialStatusDisplayName={currentStatusDisplayName}
						appliedStatusTechnicalName="applied"
						appliedStatusDisplayName={appliedStatusDisplayName}
					/>
				</CardContent>
			</Card>
		</section>
	)
}
