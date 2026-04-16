import path from "node:path"
import { readFile } from "node:fs/promises"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Info, MapPin, Wallet } from "lucide-react"

import { getSession, hasAuthAccess } from "../../../../auth"
import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "react/components/ui/card"
import { Separator } from "react/components/ui/separator"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "react/components/ui/tooltip"
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
	status?: string | null
}

type OfferEnvelope = {
	success?: boolean
	data?: JobOfferDetail
}

type ApplicationInfoResponse = {
	alreadyApplied: boolean
	applicationId?: number | null
	statusTechnicalName?: string
	appliedAt?: string | null
	evaluationUpdatedAt?: string | null
	evaluationStatus?: "pending" | "processing" | "completed" | "failed" | null
	scores?: {
		technical?: number | null
		soft?: number | null
		culture?: number | null
		overall?: number | null
	}
	aiFeedback?: Record<string, string> | null
}

type ApplicationInfoEnvelope = {
	success?: boolean
	data?: ApplicationInfoResponse
}

type SimilarJobPreview = {
	id: number
	rank: number
	similarity_score: number
	overall_score: number | null
	jobs: {
		id: number
		title: string
		city: string | null
		state: string | null
		position: string | null
		salary: string | null
	} | null
}

function getEvaluationStatusLabel(status: ApplicationInfoResponse["evaluationStatus"]) {
	if (status === "completed") {
		return "Completada"
	}

	if (status === "processing") {
		return "En proceso"
	}

	if (status === "failed") {
		return "Con error"
	}

	if (status === "pending") {
		return "En cola"
	}

	return "Sin estado"
}

function toEvaluationStatus(value: unknown): ApplicationInfoResponse["evaluationStatus"] {
	if (value === "pending" || value === "processing" || value === "completed" || value === "failed") {
		return value
	}

	return null
}

function normalizeApplicationInfo(payload: unknown): ApplicationInfoResponse {
	if (!payload || typeof payload !== "object") {
		return { alreadyApplied: false }
	}

	const source = payload as Record<string, unknown>
	const alreadyApplied = source.alreadyApplied === true
	const applicationId = typeof source.applicationId === "number" ? source.applicationId : null
	const statusTechnicalName =
		typeof source.statusTechnicalName === "string" ? source.statusTechnicalName : undefined
	const evaluationUpdatedAt =
		typeof source.evaluationUpdatedAt === "string"
			? source.evaluationUpdatedAt
			: typeof source.evaluation_updated_at === "string"
				? source.evaluation_updated_at
				: typeof source.updated_at === "string"
					? source.updated_at
					: null
	const appliedAt =
		typeof source.appliedAt === "string"
			? source.appliedAt
			: typeof source.applied_at === "string"
				? source.applied_at
				: null
	const evaluationStatus =
		toEvaluationStatus(source.evaluationStatus) ?? toEvaluationStatus(source.evaluation_status)

	const rawScores =
		source.scores && typeof source.scores === "object"
			? (source.scores as Record<string, unknown>)
			: null

	const toNullableNumber = (value: unknown): number | null =>
		typeof value === "number" && Number.isFinite(value) ? value : null

	const scores = rawScores
		? {
				technical: toNullableNumber(rawScores.technical),
				soft: toNullableNumber(rawScores.soft),
				culture: toNullableNumber(rawScores.culture),
				overall: toNullableNumber(rawScores.overall),
			}
		: undefined

	const rawAiFeedback =
		source.aiFeedback && typeof source.aiFeedback === "object"
			? (source.aiFeedback as Record<string, unknown>)
			: source.ai_feedback && typeof source.ai_feedback === "object"
				? (source.ai_feedback as Record<string, unknown>)
				: null

	const aiFeedback = rawAiFeedback
		? Object.fromEntries(
				Object.entries(rawAiFeedback)
					.map(([title, content]) => [String(title).trim(), String(content).trim()] as const)
					.filter(([title, content]) => title.length > 0 && content.length > 0)
			)
		: null

	return {
		alreadyApplied,
		applicationId,
		statusTechnicalName,
		appliedAt,
		evaluationUpdatedAt,
		evaluationStatus,
		scores,
		aiFeedback: aiFeedback && Object.keys(aiFeedback).length > 0 ? aiFeedback : null,
	}
}

function formatScore(value: number | null | undefined) {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return "-"
	}

	const percentage = Math.max(0, Math.min(100, value * 100))
	return `${percentage.toFixed(1)}%`
}

function formatDateTime(value: string | null | undefined) {
	if (!value) {
		return "-"
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return "-"
	}

	return new Intl.DateTimeFormat("es-VE", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date)
}

type TimelineState = "done" | "current" | "upcoming" | "error"

type TimelineStep = {
	title: string
	description: string
	state: TimelineState
}

function buildEvaluationTimeline(status: ApplicationInfoResponse["evaluationStatus"]): TimelineStep[] {
	if (status === "completed") {
		return [
			{
				title: "Postulación enviada",
				description: "Tu candidatura fue registrada correctamente.",
				state: "done",
			},
			{
				title: "Evaluación en proceso",
				description: "Revisamos afinidad técnica, blanda y cultural.",
				state: "done",
			},
			{
				title: "Resultado disponible",
				description: "Ya puedes revisar compatibilidad y retroalimentación.",
				state: "done",
			},
		]
	}

	if (status === "processing") {
		return [
			{
				title: "Postulación enviada",
				description: "Tu candidatura fue registrada correctamente.",
				state: "done",
			},
			{
				title: "Evaluación en proceso",
				description: "Estamos analizando tu perfil para esta oferta.",
				state: "current",
			},
			{
				title: "Resultado disponible",
				description: "Te mostraremos tu compatibilidad al finalizar.",
				state: "upcoming",
			},
		]
	}

	if (status === "failed") {
		return [
			{
				title: "Postulación enviada",
				description: "Tu candidatura fue registrada correctamente.",
				state: "done",
			},
			{
				title: "Evaluación en proceso",
				description: "Intentamos calcular tu evaluación automáticamente.",
				state: "done",
			},
			{
				title: "Evaluación con error",
				description: "Tuvimos un problema temporal. Intenta revisar más tarde.",
				state: "error",
			},
		]
	}

	return [
		{
			title: "Postulación enviada",
			description: "Tu candidatura fue registrada correctamente.",
			state: "current",
		},
		{
			title: "Evaluación en cola",
			description: "Tu evaluación comenzará en breve.",
			state: "upcoming",
		},
		{
			title: "Resultado disponible",
			description: "Verás retroalimentación y ofertas similares al finalizar.",
			state: "upcoming",
		},
	]
}

function getTimelineStyles(state: TimelineState) {
	switch (state) {
		case "done":
			return {
				dot: "bg-primary",
				card: "border-primary/35 bg-primary/5",
			}
		case "current":
			return {
				dot: "bg-accent",
				card: "border-accent/40 bg-accent/10",
			}
		case "error":
			return {
				dot: "bg-destructive",
				card: "border-destructive/35 bg-destructive/10",
			}
		case "upcoming":
		default:
			return {
				dot: "bg-muted-foreground/40",
				card: "border-border/70 bg-background/70",
			}
	}
}

type OfertasDetailPageProps = {
	params: Promise<{ id: string }>
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function pickSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value
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
	const endpoints = [`${apiBaseUrl}/api/jobs/${offerId}`, `${apiBaseUrl}/jobs/${offerId}`]

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				method: "GET",
				cache: "no-store",
			})

			if (!response.ok) {
				continue
			}

			const payload = (await response.json()) as JobOfferDetail | OfferEnvelope

			if (payload && typeof payload === "object" && "data" in payload && payload.data) {
				return payload.data
			}

			return payload as JobOfferDetail
		} catch {
			// Try next endpoint variant.
		}
	}

	return null
}

async function fetchApplicationInfoServer(
	offerId: number,
	cookieHeader: string,
	accessToken?: string
): Promise<ApplicationInfoResponse> {
	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
	const endpoints = [
		`${apiBaseUrl}/api/applications/me/${offerId}`,
		`${apiBaseUrl}/applications/me/${offerId}`,
	]

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				method: "GET",
				headers: {
					cookie: cookieHeader,
					...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				},
				cache: "no-store",
			})

			if (!response.ok) {
				continue
			}

			const payload = (await response.json()) as
				| ApplicationInfoResponse
				| ApplicationInfoEnvelope

			if (payload && typeof payload === "object" && "data" in payload && payload.data) {
				return normalizeApplicationInfo(payload.data)
			}

			return normalizeApplicationInfo(payload)
		} catch {
			// Try next endpoint variant.
		}
	}

	return {
		alreadyApplied: false,
		appliedAt: null,
	}
}

async function fetchSimilarJobsPreviewServer(
	applicationId: number,
	cookieHeader: string,
	accessToken?: string
): Promise<SimilarJobPreview[]> {
	if (!Number.isFinite(applicationId) || applicationId <= 0) {
		return []
	}

	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
	const endpoints = [
		`${apiBaseUrl}/api/applications/${applicationId}/similar-jobs`,
		`${apiBaseUrl}/applications/${applicationId}/similar-jobs`,
	]

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				method: "GET",
				headers: {
					cookie: cookieHeader,
					...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				},
				cache: "no-store",
			})

			if (!response.ok) {
				continue
			}

			const payload = (await response.json()) as unknown
			if (!Array.isArray(payload)) {
				return []
			}

			return payload
				.map((item) => {
					if (!item || typeof item !== "object") {
						return null
					}

					const source = item as Record<string, unknown>
					const jobs =
						source.jobs && typeof source.jobs === "object"
							? (source.jobs as Record<string, unknown>)
							: null

					const id = Number(source.id)
					const rank = Number(source.rank)
					const similarityScore = Number(source.similarity_score)
					const overallScore =
						typeof source.overall_score === "number" && Number.isFinite(source.overall_score)
							? source.overall_score
							: null

					if (!Number.isFinite(id) || !Number.isFinite(rank) || !Number.isFinite(similarityScore)) {
						return null
					}

					return {
						id,
						rank,
						similarity_score: similarityScore,
						overall_score: overallScore,
						jobs: jobs
							? {
								id: Number(jobs.id),
								title: typeof jobs.title === "string" ? jobs.title : "Oferta similar",
								city: typeof jobs.city === "string" ? jobs.city : null,
								state: typeof jobs.state === "string" ? jobs.state : null,
								position: typeof jobs.position === "string" ? jobs.position : null,
								salary: typeof jobs.salary === "string" ? jobs.salary : null,
							}
							: null,
					}
				})
				.filter((value): value is SimilarJobPreview => Boolean(value))
				.slice(0, 3)
		} catch {
			// Try next endpoint variant.
		}
	}

	return []
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

export default async function OfertaDetallePage({ params, searchParams }: OfertasDetailPageProps) {
	const resolvedParams = await params
	const resolvedSearchParams = (await searchParams) ?? {}
	const offerId = Number(resolvedParams.id)
	const returnTo = pickSingleParam(resolvedSearchParams.returnTo)
	const openSimilarParam = pickSingleParam(resolvedSearchParams.openSimilar)
	const openSimilarId = Number(openSimilarParam)
	const returnToPostulacionesHref =
		returnTo === "postulaciones" && Number.isFinite(openSimilarId) && openSimilarId > 0
			? `/mi-perfil/postulaciones?openSimilar=${openSimilarId}`
			: "/mi-perfil/postulaciones"

	if (!Number.isFinite(offerId)) {
		notFound()
	}

	const session = await getSession()
	const requestHeaders = await headers()
	const cookieHeader = requestHeaders.get("cookie") ?? ""
	const userId = session?.user?.id ?? ""
	const isLoggedIn = Boolean(userId)
	const isCandidate = isLoggedIn ? await hasAuthAccess("candidate") : false
	const accessToken = session?.accessToken

	const [offerDetail, jobParameters, applicationStatusItems] =
		await Promise.all([
			fetchOfferDetailServer(offerId),
			readJsonFile<OfferParameter[]>("job_parameters.json"),
			readJsonFile<ApplicationStatusItem[]>("application_status.json"),
		])

	if (!offerDetail) {
		notFound()
	}

	if ((offerDetail.status ?? "").toLowerCase() !== "published") {
		return (
			<section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
				<div>
						<Button asChild variant="ghost" className="-ml-2 rounded-full">
						<Link href="/ofertas">
								<ArrowLeft aria-hidden="true" className="size-4" />
							Volver atrás
						</Link>
					</Button>
				</div>

					<Card className="rounded-3xl border-border/75 bg-card/92 shadow-soft">
					<CardHeader>
						<CardTitle className="text-2xl">Oferta no disponible</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Esta oferta no se encuentra disponible para postulaciones en este momento.
						</p>
					</CardContent>
				</Card>
			</section>
		)
	}

	const applicationInfo = isCandidate
		? await fetchApplicationInfoServer(offerId, cookieHeader, accessToken)
		: { alreadyApplied: false, appliedAt: null, evaluationStatus: null }
	const applicationIdForSimilarPreview =
		typeof applicationInfo.applicationId === "number" ? applicationInfo.applicationId : null
	const shouldLoadSimilarPreview =
		isCandidate &&
		applicationInfo.alreadyApplied &&
		applicationInfo.evaluationStatus === "completed" &&
		applicationIdForSimilarPreview !== null
	const similarJobsPreview = shouldLoadSimilarPreview
		? await fetchSimilarJobsPreviewServer(
				applicationIdForSimilarPreview,
				cookieHeader,
				accessToken
		  )
		: []

	const statusMap = buildStatusMap(applicationStatusItems)
	const appliedStatusDisplayName = statusMap.get("applied") ?? "Postulado"
	const currentStatusDisplayName = applicationInfo.statusTechnicalName
		? statusMap.get(applicationInfo.statusTechnicalName)
		: undefined
	const scoreValues = applicationInfo.scores
	const hasScoresReady =
		typeof scoreValues?.technical === "number" &&
		typeof scoreValues.soft === "number" &&
		typeof scoreValues.culture === "number" &&
		typeof scoreValues.overall === "number"
	const aiFeedbackEntries = Object.entries(applicationInfo.aiFeedback ?? {}).filter(
		([title, text]) => title.trim().length > 0 && text.trim().length > 0
	)
	const availableScoreCount = [
		scoreValues?.technical,
		scoreValues?.soft,
		scoreValues?.culture,
		scoreValues?.overall,
	].filter((value) => typeof value === "number").length
	const hasLowDataCoverage = availableScoreCount < 3 || aiFeedbackEntries.length < 2
	const canShowTransparencyPanel =
		isCandidate &&
		applicationInfo.alreadyApplied &&
		(availableScoreCount > 0 || aiFeedbackEntries.length > 0 || applicationInfo.evaluationStatus === "completed")
	const timelineSteps = buildEvaluationTimeline(applicationInfo.evaluationStatus)
	const myApplicationsHref = "/mi-perfil/postulaciones"
	const similarJobsHref =
		typeof applicationInfo.applicationId === "number"
			? `/mi-perfil/postulaciones?openSimilar=${applicationInfo.applicationId}`
			: myApplicationsHref
	const canDeepLinkToSimilarJobs =
		applicationInfo.evaluationStatus === "completed" && typeof applicationInfo.applicationId === "number"
	const hasAnyScores = availableScoreCount > 0
	const canShowSimilarJobsPreview = shouldLoadSimilarPreview && similarJobsPreview.length > 0

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
					<Button asChild variant="ghost" className="-ml-2 rounded-full">
					<Link href={returnTo === "postulaciones" ? returnToPostulacionesHref : "/ofertas"}>
							<ArrowLeft aria-hidden="true" className="size-4" />
						{returnTo === "postulaciones" ? "Volver a mis postulaciones" : "Volver atrás"}
					</Link>
				</Button>
			</div>

				<Card className="gradient-border rounded-3xl bg-card/94 shadow-soft">
				<CardHeader className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">{workplaceTypeLabel}</Badge>
							<Badge variant="secondary" className="bg-muted text-foreground">{employmentTypeLabel}</Badge>
					</div>
					<CardTitle className="text-2xl">{offerDetail.title}</CardTitle>
				</CardHeader>

				<CardContent className="space-y-6">
					<p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
						{offerDetail.description}
					</p>

					<Separator />

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
								<MapPin aria-hidden="true" className="size-4 text-primary" />
							<span>
								{offerDetail.city}, {offerDetail.state}
							</span>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
								<BriefcaseBusiness aria-hidden="true" className="size-4 text-primary" />
							<span>{offerDetail.position}</span>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
								<MapPin aria-hidden="true" className="size-4 text-primary" />
							<span>{offerDetail.address}</span>
						</p>
						<p className="flex items-center gap-2 text-sm font-semibold">
								<Wallet aria-hidden="true" className="size-4 text-accent" />
							<span>${offerDetail.salary} / mes</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="text-muted-foreground transition-colors hover:text-foreground"
											aria-label="Información del salario"
										>
											<Info className="size-3.5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">Salario referencial calculado a la tasa del BCV.</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</p>
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
								<CalendarDays aria-hidden="true" className="size-4 text-primary" />
							<span>Publicado: {formatPublishedDate(offerDetail.updated_at)}</span>
						</p>
					</div>

					<Separator />

					<PostularseButton
						jobId={offerId}
						isLoggedIn={isLoggedIn}
						isCandidate={isCandidate}
						alreadyApplied={applicationInfo.alreadyApplied}
						initialAppliedAt={applicationInfo.appliedAt}
						initialStatusTechnicalName={applicationInfo.statusTechnicalName}
						initialStatusDisplayName={currentStatusDisplayName}
						initialEvaluationStatus={applicationInfo.evaluationStatus}
						appliedStatusTechnicalName="applied"
						appliedStatusDisplayName={appliedStatusDisplayName}
					/>

					{isCandidate && applicationInfo.alreadyApplied ? (
						<>
							<Separator />
							<div className="space-y-3">
								<div>
									<h3 className="text-lg font-semibold">Estado de tu evaluación</h3>
									<p className="text-sm text-muted-foreground">
										Este es el progreso de tu postulación en el proceso automático de análisis.
									</p>
								</div>

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									{timelineSteps.map((step) => {
										const styles = getTimelineStyles(step.state)

										return (
											<div key={step.title} className={`rounded-xl border p-3 ${styles.card}`}>
												<div className="flex items-center gap-2">
													<span className={`size-2 rounded-full ${styles.dot}`} />
													<p className="text-sm font-semibold text-foreground">{step.title}</p>
												</div>
												<p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
											</div>
										)
									})}
								</div>

								<div className="flex flex-wrap gap-2">
									<Button asChild variant="outline" className="rounded-full">
										<Link href={myApplicationsHref}>Ir a mis postulaciones</Link>
									</Button>
									{canDeepLinkToSimilarJobs ? (
										<Button asChild className="rounded-full">
											<Link href={similarJobsHref}>Ver ofertas similares</Link>
										</Button>
									) : null}
								</div>

								{applicationInfo.evaluationStatus === "completed" && !canDeepLinkToSimilarJobs ? (
									<p className="text-xs text-muted-foreground">
										Tu resultado ya está listo. Abre Mis postulaciones y usa el botón Ver similares en la tarjeta correspondiente.
									</p>
								) : null}
							</div>
						</>
					) : null}

					{canShowSimilarJobsPreview ? (
						<>
							<Separator />
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3">
									<div>
										<h3 className="text-lg font-semibold">Ofertas similares para ti</h3>
										<p className="text-sm text-muted-foreground">
											Recomendaciones basadas en la oferta a la que ya postulaste y tu evaluación actual.
										</p>
									</div>
									<Button asChild size="sm" variant="outline" className="rounded-full">
										<Link href={similarJobsHref}>Ver todas en mis postulaciones</Link>
									</Button>
								</div>

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									{similarJobsPreview.map((similarJob) => (
										<div key={similarJob.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
											<p className="text-sm font-semibold text-foreground">
												#{similarJob.rank} {similarJob.jobs?.title ?? "Oferta similar"}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												Similitud entre ofertas: {(similarJob.similarity_score * 100).toFixed(1)}%
												{typeof similarJob.overall_score === "number"
													? ` · Compatibilidad con tu perfil: ${(similarJob.overall_score * 100).toFixed(1)}%`
													: ""}
											</p>
											{similarJob.jobs?.city && similarJob.jobs?.state ? (
												<p className="mt-1 text-xs text-muted-foreground">
													{similarJob.jobs.city}, {similarJob.jobs.state}
												</p>
											) : null}
											{similarJob.jobs?.id ? (
												<Button asChild size="sm" className="mt-2 rounded-full">
													<Link href={`/ofertas/${similarJob.jobs.id}?returnTo=postulaciones&openSimilar=${applicationIdForSimilarPreview ?? ""}`}>
														Ver oferta
													</Link>
												</Button>
											) : null}
										</div>
									))}
								</div>
							</div>
						</>
					) : null}

					{canShowTransparencyPanel ? (
						<>
							<Separator />
							<div className="space-y-4">
								<div>
									<h3 className="text-lg font-semibold">Lectura transparente del resultado</h3>
									<p className="text-sm text-muted-foreground">
										Esta sección muestra solo datos devueltos por la evaluación backend, sin clasificación o interpretación adicional en frontend.
									</p>
								</div>

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<div className="rounded-xl border border-border/70 bg-background/70 p-3">
										<p className="text-sm font-semibold text-foreground">Estado de evaluación</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{getEvaluationStatusLabel(applicationInfo.evaluationStatus)}
										</p>
									</div>

									<div className="rounded-xl border border-border/70 bg-background/70 p-3">
										<p className="text-sm font-semibold text-foreground">Última actualización</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{formatDateTime(applicationInfo.evaluationUpdatedAt)}
										</p>
									</div>

									<div className="rounded-xl border border-border/70 bg-background/70 p-3">
										<p className="text-sm font-semibold text-foreground">Cobertura de datos</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{availableScoreCount}/4 dimensiones con puntaje y {aiFeedbackEntries.length} secciones de retroalimentación.
										</p>
									</div>
								</div>

								{hasAnyScores ? (
									<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
										<div className="rounded-xl border bg-muted/35 p-3">
											<p className="text-xs text-muted-foreground">Técnico</p>
											<p className="text-base font-semibold">{formatScore(scoreValues?.technical)}</p>
										</div>
										<div className="rounded-xl border bg-muted/35 p-3">
											<p className="text-xs text-muted-foreground">Habilidades blandas</p>
											<p className="text-base font-semibold">{formatScore(scoreValues?.soft)}</p>
										</div>
										<div className="rounded-xl border bg-muted/35 p-3">
											<p className="text-xs text-muted-foreground">Cultura</p>
											<p className="text-base font-semibold">{formatScore(scoreValues?.culture)}</p>
										</div>
										<div className="rounded-xl border bg-primary/10 p-3">
											<p className="text-xs text-muted-foreground">Compatibilidad general</p>
											<p className="text-base font-semibold text-primary">{formatScore(scoreValues?.overall)}</p>
										</div>
									</div>
								) : null}

								<div className="space-y-3">
									{aiFeedbackEntries.length > 0 ? (
										aiFeedbackEntries.map(([title, content]) => (
											<div key={title} className="rounded-xl border bg-background/70 p-4">
												<h4 className="text-sm font-semibold text-foreground">{title}</h4>
												<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content}</p>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">No hay secciones de retroalimentación disponibles para esta evaluación.</p>
									)}
								</div>

							</div>
						</>
					) : null}
				</CardContent>
			</Card>
		</section>
	)
}
