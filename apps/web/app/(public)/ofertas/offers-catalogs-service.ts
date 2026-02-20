import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import type {
  JobOffer,
  JobParameterOption,
  OffersCatalogsResponse,
} from "./offers-types"

type JobParameterCatalog = {
  technical_name: string
  display_name: string
  values: JobParameterOption[]
}

type BackendCatalogsResponse =
  | OffersCatalogsResponse
  | {
      categories?: string[]
      cities?: string[]
      workplace_types?: JobParameterOption[]
      employment_types?: JobParameterOption[]
    }

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function getJobParameterOptions(
  parameters: JobParameterCatalog[],
  key: "workplace_type" | "employment_type"
) {
  const entry = parameters.find((item) => item.technical_name === key)
  return entry?.values ?? []
}

function buildCatalogsFromOffers(
  offers: JobOffer[],
  jobParameters: JobParameterCatalog[]
): OffersCatalogsResponse {
  return {
    categories: Array.from(new Set(offers.map((offer) => offer.category))).sort(),
    cities: Array.from(new Set(offers.map((offer) => offer.city))).sort(),
    workplace_types: getJobParameterOptions(jobParameters, "workplace_type"),
    employment_types: getJobParameterOptions(jobParameters, "employment_type"),
  }
}

export async function getOffersCatalogsServer(): Promise<OffersCatalogsResponse> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

  try {
    const response = await fetch(`${apiBaseUrl}/jobs/catalogs`, {
      method: "GET",
      cache: "no-store",
    })

    if (response.ok) {
      const payload = (await response.json()) as BackendCatalogsResponse
      const jobParameters = await readJsonFile<JobParameterCatalog[]>("job_parameters.json")
      return {
        categories: payload.categories ?? [],
        cities: payload.cities ?? [],
        workplace_types: getJobParameterOptions(jobParameters, "workplace_type"),
        employment_types: getJobParameterOptions(jobParameters, "employment_type"),
      }
    }
  } catch {
    // Fallback to mock data while backend endpoint is not implemented.
  }

  const [offers, jobParameters] = await Promise.all([
    readJsonFile<JobOffer[]>("job_offers_dummy.json"),
    readJsonFile<JobParameterCatalog[]>("job_parameters.json"),
  ])

  return buildCatalogsFromOffers(offers, jobParameters)
}
