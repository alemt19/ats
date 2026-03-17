import path from "node:path"
import { readFile } from "node:fs/promises"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin, Wallet } from "lucide-react"

import { getSession, hasAuthAccess } from "../../../../auth"
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
	status?: string | null
}

type OfferEnvelope = {
	success?: boolean
	data?: JobOfferDetail
}

type ApplicationInfoResponse = {
	alreadyApplied: boolean
	statusTechnicalName?: string
	appliedAt?: string | null
	evaluationStatus?: string | null
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

function normalizeApplicationInfo(payload: unknown): ApplicationInfoResponse {
	if (!payload || typeof payload !== "object") {
		return { alreadyApplied: false }
	}

	const source = payload as Record<string, unknown>
	const alreadyApplied = source.alreadyApplied === true
	const statusTechnicalName =
		typeof source.statusTechnicalName === "string" ? source.statusTechnicalName : undefined
	const appliedAt =
		typeof source.appliedAt === "string"
			? source.appliedAt
			: typeof source.applied_at === "string"
				? source.applied_at
				: null
	const evaluationStatus =
		typeof source.evaluationStatus === "string"
			? source.evaluationStatus
			: typeof source.evaluation_status === "string"
				? source.evaluation_status
				: null

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
		statusTechnicalName,
		appliedAt,
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
		: { alreadyApplied: false, appliedAt: null }

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
	const canShowEvaluationInsights =
		isCandidate && applicationInfo.alreadyApplied && hasScoresReady && aiFeedbackEntries.length > 0

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
					<Link href="/ofertas">
							<ArrowLeft aria-hidden="true" className="size-4" />
						Volver atrás
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
						appliedStatusTechnicalName="applied"
						appliedStatusDisplayName={appliedStatusDisplayName}
					/>

					{canShowEvaluationInsights ? (
						<>
							<Separator />
							<div className="space-y-4">
								<div>
									<h3 className="text-lg font-semibold">Tu evaluacion de compatibilidad</h3>
									<p className="text-sm text-muted-foreground">
										Este analisis fue generado automaticamente para orientar tanto al candidato como al equipo reclutador.
									</p>
								</div>

								<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
									<div className="rounded-xl border bg-muted/35 p-3">
										<p className="text-xs text-muted-foreground">Tecnico</p>
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

								<div className="space-y-3">
									{aiFeedbackEntries.map(([title, content]) => (
										<div key={title} className="rounded-xl border bg-background/70 p-4">
											<h4 className="text-sm font-semibold text-foreground">{title}</h4>
											<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content}</p>
										</div>
									))}
								</div>
							</div>
						</>
					) : null}
				</CardContent>
			</Card>
		</section>
	)
}
