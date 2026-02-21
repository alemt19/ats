import "server-only"

import path from "node:path"
import { readFile } from "node:fs/promises"

import {
  type AdminOffer,
  type AdminOffersCatalogsResponse,
  type AdminOffersQueryParams,
  type AdminOffersResponse,
  type JobParameterOption,
  normalizeAdminOffersQuery,
} from "./offers-admin-types"

type JobParameterCatalog = {
  technical_name: string
  display_name: string
  values: JobParameterOption[]
}

type DummyProductsResponse = {
  products: Array<{
    id: number
    title: string
    category: string
    rating: number
    stock: number
    brand?: string
  }>
}

type DummyUsersResponse = {
  users: Array<{
    firstName: string
    lastName: string
    company?: { name?: string }
    address?: {
      city?: string
      state?: string
    }
  }>
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function humanizeCategory(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getJobParameterOptions(
  parameters: JobParameterCatalog[],
  key: "workplace_type" | "employment_type" | "status"
) {
  const entry = parameters.find((item) => item.technical_name === key)
  return entry?.values ?? []
}

function buildDateFromIndex(index: number) {
  const base = new Date("2024-07-01T00:00:00.000Z")
  base.setDate(base.getDate() - index * 2)
  return base.toISOString().split("T")[0] ?? "2024-07-01"
}

function normalizeStatusLabel(status: string) {
  switch (status) {
    case "published":
      return "Activa"
    case "draft":
      return "Pausada"
    case "closed":
      return "Cerrada"
    case "archived":
      return "Archivada"
    default:
      return status
  }
}

async function getAllAdminOffers(): Promise<AdminOffer[]> {
  const [productsResponse, usersResponse] = await Promise.all([
    fetch("https://dummyjson.com/products?limit=80", { cache: "no-store" }),
    fetch("https://dummyjson.com/users?limit=80", { cache: "no-store" }),
  ])

  if (!productsResponse.ok || !usersResponse.ok) {
    throw new Error("No se pudieron obtener las ofertas")
  }

  const products = (await productsResponse.json()) as DummyProductsResponse
  const users = (await usersResponse.json()) as DummyUsersResponse

  const statuses = ["published", "published", "draft", "closed", "published", "archived"]
  const workplaceTypes = ["onsite", "remote", "hybrid"]
  const employmentTypes = ["full_time", "part_time", "contract", "internship"]

  return products.products.map((product, index) => {
    const user = users.users[index % users.users.length]
    const locationCity = user?.address?.city ?? "Caracas"
    const locationState = user?.address?.state ?? "Distrito Capital"
    const companyName =
      user?.company?.name ?? product.brand ?? `${user?.firstName ?? "Talent"} ${user?.lastName ?? "Corp"}`

    const status = statuses[index % statuses.length] as AdminOffer["status"]

    return {
      id: product.id,
      title: product.title,
      company: companyName,
      category: humanizeCategory(product.category),
      city: locationCity,
      state: locationState,
      candidateCount: Math.max(3, Math.round(product.stock * 0.9 + product.rating * 8)),
      createdAt: buildDateFromIndex(index),
      status,
      workplace_type: workplaceTypes[index % workplaceTypes.length] ?? "onsite",
      employment_type: employmentTypes[index % employmentTypes.length] ?? "full_time",
    }
  })
}

function applyFiltering(allOffers: AdminOffer[], query: AdminOffersQueryParams): AdminOffersResponse {
  const normalizedTitle = query.title.toLowerCase()

  const filtered = allOffers.filter((offer) => {
    const titleMatch = normalizedTitle
      ? offer.title.toLowerCase().includes(normalizedTitle) ||
        offer.company.toLowerCase().includes(normalizedTitle)
      : true

    const categoryMatch = query.category === "all" ? true : offer.category === query.category
    const workplaceMatch = query.workplace_type === "all" ? true : offer.workplace_type === query.workplace_type
    const employmentMatch =
      query.employment_type === "all" ? true : offer.employment_type === query.employment_type
    const cityMatch = query.city === "all" ? true : offer.city === query.city
    const stateMatch = query.state === "all" ? true : offer.state === query.state
    const statusMatch = query.status === "all" ? true : offer.status === query.status

    return (
      titleMatch &&
      categoryMatch &&
      workplaceMatch &&
      employmentMatch &&
      cityMatch &&
      stateMatch &&
      statusMatch
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

export async function getAdminOffersServer(
  queryInput?: Partial<Record<keyof AdminOffersQueryParams, string | number | undefined>>
): Promise<AdminOffersResponse> {
  const query = normalizeAdminOffersQuery(queryInput)

  try {
    const allOffers = await getAllAdminOffers()
    return applyFiltering(allOffers, query)
  } catch {
    const fallbackOffers: AdminOffer[] = [
      {
        id: 1,
        title: "Desarrollador Full-Stack",
        company: "Tech Solutions C.A.",
        category: "Tecnología",
        city: "Caracas",
        state: "Distrito Capital",
        candidateCount: 25,
        createdAt: "2024-07-20",
        status: "published",
        workplace_type: "hybrid",
        employment_type: "full_time",
      },
    ]

    return applyFiltering(fallbackOffers, query)
  }
}

export async function getAdminOffersCatalogsServer(): Promise<AdminOffersCatalogsResponse> {
  try {
    const [allOffers, jobParameters] = await Promise.all([
      getAllAdminOffers(),
      readJsonFile<JobParameterCatalog[]>("job_parameters.json"),
    ])

    return {
      categories: Array.from(new Set(allOffers.map((offer) => offer.category))).sort(),
      cities: Array.from(new Set(allOffers.map((offer) => offer.city))).sort(),
      states: Array.from(new Set(allOffers.map((offer) => offer.state))).sort(),
      workplace_types: getJobParameterOptions(jobParameters, "workplace_type"),
      employment_types: getJobParameterOptions(jobParameters, "employment_type"),
      statuses: getJobParameterOptions(jobParameters, "status").map((status) => ({
        ...status,
        display_name: normalizeStatusLabel(status.technical_name),
      })),
    }
  } catch {
    return {
      categories: ["Tecnología"],
      cities: ["Caracas"],
      states: ["Distrito Capital"],
      workplace_types: [
        { technical_name: "remote", display_name: "Remoto" },
        { technical_name: "hybrid", display_name: "Híbrido" },
        { technical_name: "onsite", display_name: "Presencial" },
      ],
      employment_types: [
        { technical_name: "full_time", display_name: "Tiempo completo" },
        { technical_name: "part_time", display_name: "Medio tiempo" },
      ],
      statuses: [
        { technical_name: "published", display_name: "Activa" },
        { technical_name: "draft", display_name: "Pausada" },
        { technical_name: "closed", display_name: "Cerrada" },
      ],
    }
  }
}
