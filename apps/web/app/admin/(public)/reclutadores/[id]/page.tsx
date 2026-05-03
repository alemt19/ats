import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { getRecruiterByIdServer } from "../recruiters-admin-service"
import RecruiterForm from "../recruiter-form"

type AdminReclutadorDetallePageProps = {
	params: Promise<{ id: string }>
}

export default async function AdminReclutadorDetallePage({ params }: AdminReclutadorDetallePageProps) {
	const resolvedParams = await params
	const recruiterId = Number(resolvedParams.id)

	if (!Number.isFinite(recruiterId) || recruiterId <= 0) {
		notFound()
	}

	const cookie = (await headers()).get("cookie") ?? undefined
	const recruiter = await getRecruiterByIdServer(recruiterId, cookie)

	if (!recruiter) {
		notFound()
	}

	return <RecruiterForm mode="edit" recruiterId={recruiterId} initialRecruiter={recruiter} />
}
