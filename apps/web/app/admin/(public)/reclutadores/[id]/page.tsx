import { notFound } from "next/navigation"

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

	return <RecruiterForm mode="edit" recruiterId={recruiterId} />
}
