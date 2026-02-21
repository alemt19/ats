import OfertasAdminClient from "./ofertas-admin-client"
import { getAdminOffersCatalogsServer, getAdminOffersServer } from "./offers-admin-service"
import { normalizeAdminOffersQuery, type AdminOffersQueryParams } from "./offers-admin-types"

type AdminOfertasPageProps = {
	searchParams?: Promise<Partial<Record<keyof AdminOffersQueryParams, string | string[] | undefined>>>
}

export default async function AdminOfertasPage({ searchParams }: AdminOfertasPageProps) {
	const resolvedSearchParams = await searchParams

	const initialQuery = normalizeAdminOffersQuery({
		title: Array.isArray(resolvedSearchParams?.title)
			? resolvedSearchParams?.title[0]
			: resolvedSearchParams?.title,
		category: Array.isArray(resolvedSearchParams?.category)
			? resolvedSearchParams?.category[0]
			: resolvedSearchParams?.category,
		workplace_type: Array.isArray(resolvedSearchParams?.workplace_type)
			? resolvedSearchParams?.workplace_type[0]
			: resolvedSearchParams?.workplace_type,
		employment_type: Array.isArray(resolvedSearchParams?.employment_type)
			? resolvedSearchParams?.employment_type[0]
			: resolvedSearchParams?.employment_type,
		city: Array.isArray(resolvedSearchParams?.city)
			? resolvedSearchParams?.city[0]
			: resolvedSearchParams?.city,
		state: Array.isArray(resolvedSearchParams?.state)
			? resolvedSearchParams?.state[0]
			: resolvedSearchParams?.state,
		status: Array.isArray(resolvedSearchParams?.status)
			? resolvedSearchParams?.status[0]
			: resolvedSearchParams?.status,
		page: Array.isArray(resolvedSearchParams?.page)
			? resolvedSearchParams?.page[0]
			: resolvedSearchParams?.page,
		pageSize: Array.isArray(resolvedSearchParams?.pageSize)
			? resolvedSearchParams?.pageSize[0]
			: resolvedSearchParams?.pageSize,
	})

	const [initialData, initialCatalogs] = await Promise.all([
		getAdminOffersServer(initialQuery),
		getAdminOffersCatalogsServer(),
	])

	return (
		<OfertasAdminClient
			initialQuery={initialQuery}
			initialData={initialData}
			initialCatalogs={initialCatalogs}
		/>
	)
}
