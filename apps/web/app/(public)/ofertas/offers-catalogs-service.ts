import "server-only"

import type {
  JobParameterOption,
  OffersCatalogsResponse,
} from "./offers-types"

type BackendCatalogsResponse =
  | OffersCatalogsResponse
  | {
      categories?: string[]
      cities?: string[]
      workplace_types?: JobParameterOption[]
      employment_types?: JobParameterOption[]
    }
  | {
      success?: boolean
      data?: {
        categories?: string[]
        cities?: string[]
        workplace_types?: JobParameterOption[]
        employment_types?: JobParameterOption[]
      }
    }

  type PlainCatalogsPayload = {
    categories?: string[]
    cities?: string[]
    workplace_types?: JobParameterOption[]
    employment_types?: JobParameterOption[]
  }

function unwrapCatalogsPayload(payload: BackendCatalogsResponse): OffersCatalogsResponse {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    payload.data &&
    !Array.isArray(payload.data)
  ) {
    return unwrapCatalogsPayload(payload.data)
  }

  const plainPayload = payload as PlainCatalogsPayload

  return {
    categories: plainPayload.categories ?? [],
    cities: plainPayload.cities ?? [],
    workplace_types: plainPayload.workplace_types ?? [],
    employment_types: plainPayload.employment_types ?? [],
  }
}

export async function getOffersCatalogsServer(): Promise<OffersCatalogsResponse> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [`${apiBaseUrl}/api/jobs/catalogs`, `${apiBaseUrl}/jobs/catalogs`]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      })

      if (response.ok) {
        const payload = (await response.json()) as BackendCatalogsResponse
        return unwrapCatalogsPayload(payload)
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  throw new Error("No se pudieron cargar los catalogos de ofertas desde el backend")
}
