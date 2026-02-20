import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type EmploymentType,
  type JobOffer,
  type OffersQueryParams,
  type OffersResponse,
  type WorkplaceType,
  normalizeOffersQuery,
} from "./offers-types"

type BackendOffersResponse =
  | OffersResponse
  | {
      data?: JobOffer[]
      items?: JobOffer[]
      total?: number
      page?: number
      pageSize?: number
    }
  | JobOffer[]

function toSearchParams(query: OffersQueryParams) {
  const searchParams = new URLSearchParams()

  if (query.title) {
    searchParams.set("title", query.title)
  }

  if (query.category !== "all") {
    searchParams.set("category", query.category)
  }

  if (query.workplace_type !== "all") {
    searchParams.set("workplace_type", query.workplace_type)
  }

  if (query.employment_type !== "all") {
    searchParams.set("employment_type", query.employment_type)
  }

  if (query.city !== "all") {
    searchParams.set("city", query.city)
  }

  searchParams.set("page", String(query.page))
  searchParams.set("pageSize", String(query.pageSize))

  return searchParams
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function applyFallbackFiltering(allOffers: JobOffer[], query: OffersQueryParams): OffersResponse {
  const normalizedTitle = query.title.toLowerCase()

  const filtered = allOffers.filter((offer) => {
    const titleOrPositionMatch = normalizedTitle
      ? offer.title.toLowerCase().includes(normalizedTitle) ||
        offer.position.toLowerCase().includes(normalizedTitle)
      : true

    const categoryMatch = query.category === "all" ? true : offer.category === query.category
    const workplaceMatch =
      query.workplace_type === "all"
        ? true
        : offer.workplace_type === (query.workplace_type as WorkplaceType)
    const employmentMatch =
      query.employment_type === "all"
        ? true
        : offer.employment_type === (query.employment_type as EmploymentType)
    const cityMatch = query.city === "all" ? true : offer.city === query.city

    return (
      titleOrPositionMatch &&
      categoryMatch &&
      workplaceMatch &&
      employmentMatch &&
      cityMatch
    )
  })

  const total = filtered.length
  const start = (query.page - 1) * query.pageSize
  const items = filtered.slice(start, start + query.pageSize)

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

function parseBackendResponse(payload: BackendOffersResponse, query: OffersQueryParams): OffersResponse {
  if (Array.isArray(payload)) {
    const total = payload.length
    return {
      items: payload,
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  if ("items" in payload && Array.isArray(payload.items)) {
    return {
      items: payload.items,
      total: payload.total ?? payload.items.length,
      page: payload.page ?? query.page,
      pageSize: payload.pageSize ?? query.pageSize,
    }
  }

  if ("data" in payload && Array.isArray(payload.data)) {
    return {
      items: payload.data,
      total: payload.total ?? payload.data.length,
      page: payload.page ?? query.page,
      pageSize: payload.pageSize ?? query.pageSize,
    }
  }

  return {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getOffersServer(queryInput?:
  Partial<Record<keyof OffersQueryParams, string | number | undefined>>
): Promise<OffersResponse> {
  const query = normalizeOffersQuery(queryInput)
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

  try {
    const response = await fetch(`${apiBaseUrl}/jobs?${toSearchParams(query).toString()}`, {
      method: "GET",
      cache: "no-store",
    })

    if (response.ok) {
      const payload = (await response.json()) as BackendOffersResponse
      return parseBackendResponse(payload, query)
    }
  } catch {
    // Fallback to mock data while backend endpoint is not implemented.
  }

  await new Promise((resolve) => setTimeout(resolve, 350))
  const allOffers = await readJsonFile<JobOffer[]>("job_offers.json")
  return applyFallbackFiltering(allOffers, query)
}
