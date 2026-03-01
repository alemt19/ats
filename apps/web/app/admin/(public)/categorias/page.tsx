import CategoriasAdminClient from "./categorias-admin-client"
import { getAdminCategoriesServer } from "./categories-admin-service"
import {
	normalizeAdminCategoriesQuery,
	type AdminCategoriesQueryParams,
} from "./categories-admin-types"

type AdminCategoriasPageProps = {
	searchParams?: Promise<Partial<Record<keyof AdminCategoriesQueryParams, string | string[] | undefined>>>
}

export default async function AdminCategoriasPage({ searchParams }: AdminCategoriasPageProps) {
	const resolvedSearchParams = await searchParams

	const initialQuery = normalizeAdminCategoriesQuery({
		name: Array.isArray(resolvedSearchParams?.name)
			? resolvedSearchParams?.name[0]
			: resolvedSearchParams?.name,
		page: Array.isArray(resolvedSearchParams?.page)
			? resolvedSearchParams?.page[0]
			: resolvedSearchParams?.page,
		pageSize: Array.isArray(resolvedSearchParams?.pageSize)
			? resolvedSearchParams?.pageSize[0]
			: resolvedSearchParams?.pageSize,
	})

	const initialData = await getAdminCategoriesServer(initialQuery)

	return <CategoriasAdminClient initialQuery={initialQuery} initialData={initialData} />
}
