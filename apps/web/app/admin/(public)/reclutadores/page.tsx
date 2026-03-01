import ReclutadoresAdminClient from "./reclutadores-admin-client"
import { getRecruitersServer } from "./recruiters-admin-service"
import {
	normalizeRecruitersQuery,
	type RecruitersQueryParams,
} from "./recruiters-admin-types"

type AdminReclutadoresPageProps = {
	searchParams?: Promise<Partial<Record<keyof RecruitersQueryParams, string | string[] | undefined>>>
}

export default async function AdminReclutadoresPage({ searchParams }: AdminReclutadoresPageProps) {
	const resolvedSearchParams = await searchParams

	const initialQuery = normalizeRecruitersQuery({
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

	const initialData = await getRecruitersServer(initialQuery)

	return <ReclutadoresAdminClient initialQuery={initialQuery} initialData={initialData} />
}
