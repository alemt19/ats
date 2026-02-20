import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import type { JobOffer, OffersCatalogsResponse } from "./offers-types"

type BackendCatalogsResponse =
  | OffersCatalogsResponse
  | {
      categories?: string[]
      cities?: string[]
    }

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function buildCatalogsFromOffers(offers: JobOffer[]): OffersCatalogsResponse {
  return {
    categories: Array.from(new Set(offers.map((offer) => offer.category))).sort(),
    cities: Array.from(new Set(offers.map((offer) => offer.city))).sort(),
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
      return {
        categories: payload.categories ?? [],
        cities: payload.cities ?? [],
      }
    }
  } catch {
    // Fallback to mock data while backend endpoint is not implemented.
  }

  const offers = await readJsonFile<JobOffer[]>("job_offers.json")
  return buildCatalogsFromOffers(offers)
}
