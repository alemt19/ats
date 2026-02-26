import CandidatosAdminClient from "./candidatos-admin-client"
import { getCandidatesServer } from "./candidates-admin-service"
import {
	normalizeCandidatesQuery,
	type CandidatesQueryParams,
} from "./candidates-admin-types"

type AdminCandidatosPageProps = {
	searchParams?: Promise<Partial<Record<keyof CandidatesQueryParams, string | string[] | undefined>>>
}

export default async function AdminCandidatosPage({ searchParams }: AdminCandidatosPageProps) {
	const resolvedSearchParams = await searchParams

	const initialQuery = normalizeCandidatesQuery({
		search: Array.isArray(resolvedSearchParams?.search)
			? resolvedSearchParams?.search[0]
			: resolvedSearchParams?.search,
		page: Array.isArray(resolvedSearchParams?.page)
			? resolvedSearchParams?.page[0]
			: resolvedSearchParams?.page,
		pageSize: Array.isArray(resolvedSearchParams?.pageSize)
			? resolvedSearchParams?.pageSize[0]
			: resolvedSearchParams?.pageSize,
	})

	const initialData = await getCandidatesServer(initialQuery)

	return <CandidatosAdminClient initialQuery={initialQuery} initialData={initialData} />
}
