import { headers } from "next/headers"

import DescripcionesOfertasAdminClient from "./descripciones-ofertas-admin-client"
import { getAdminGenericJobDescriptionsServer } from "./generic-job-descriptions-admin-service"
import {
  normalizeAdminGenericJobDescriptionsQuery,
  type AdminGenericJobDescriptionsQueryParams,
} from "./generic-job-descriptions-admin-types"

type AdminDescripcionesOfertasPageProps = {
  searchParams?: Promise<Partial<Record<keyof AdminGenericJobDescriptionsQueryParams, string | string[] | undefined>>>
}

export default async function AdminDescripcionesOfertasPage({ searchParams }: AdminDescripcionesOfertasPageProps) {
  const resolvedSearchParams = await searchParams

  const initialQuery = normalizeAdminGenericJobDescriptionsQuery({
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

  const cookie = (await headers()).get("cookie") ?? undefined
  const initialData = await getAdminGenericJobDescriptionsServer(initialQuery, cookie)

  return <DescripcionesOfertasAdminClient initialQuery={initialQuery} initialData={initialData} />
}