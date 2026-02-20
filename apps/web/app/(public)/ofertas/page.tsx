import OfertasClient from "./ofertas-client"
import { type OffersQueryParams, normalizeOffersQuery } from "./offers-types"
import { getOffersCatalogsServer } from "./offers-catalogs-service"
import { getOffersServer } from "./offers-service"

type OfertasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function pickSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function OfertasPage({ searchParams }: OfertasPageProps) {
  const resolvedParams = (await searchParams) ?? {}

  const query: OffersQueryParams = normalizeOffersQuery({
    title: pickSingleParam(resolvedParams.title),
    category: pickSingleParam(resolvedParams.category),
    workplace_type: pickSingleParam(resolvedParams.workplace_type),
    employment_type: pickSingleParam(resolvedParams.employment_type),
    city: pickSingleParam(resolvedParams.city),
    page: pickSingleParam(resolvedParams.page),
    pageSize: pickSingleParam(resolvedParams.pageSize),
  })

  const [initialData, initialCatalogs] = await Promise.all([
    getOffersServer(query),
    getOffersCatalogsServer(),
  ])

  return (
    <OfertasClient
      initialQuery={query}
      initialData={initialData}
      initialCatalogs={initialCatalogs}
    />
  )
}
