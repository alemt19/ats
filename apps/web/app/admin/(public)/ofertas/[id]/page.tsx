import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import OfertaAdminDetalleClient from "./oferta-admin-detalle-client"
import { getAdminCategoriesServer } from "../../categorias/categories-admin-service"
import { getCompanyConfigServer } from "../../configuracion/company-config-service"
import { getAdminOffersCatalogsServer } from "../offers-admin-service"
import {
  getAdminOfferCandidatesServer,
  getAdminOfferDetailServer,
  getApplicationStatusOptionsServer,
} from "./offer-detail-admin-service"
import {
  normalizeAdminOfferCandidatesQuery,
  type AdminOfferCandidatesQueryParams,
} from "./offer-detail-admin-types"
import { type CrearOfertaCatalogs } from "../crear/crear-oferta-form"

type CategoryOption = {
  id: number
  name: string
}

type JobParameterValue = {
  technical_name: string
  display_name: string
}

type JobParameter = {
  technical_name: string
  display_name: string
  values: JobParameterValue[]
}

type StateItem = {
  id: string
  name: string
}

type CityItem = {
  id: string
  name: string
  state_id: string
}

type AdminOfertaDetallePageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<
    Partial<Record<keyof AdminOfferCandidatesQueryParams, string | string[] | undefined>>
  >
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function getParameterOptions(
  parameters: JobParameter[],
  key: "workplace_type" | "employment_type" | "status"
) {
  const entry = parameters.find((item) => item.technical_name === key)
  return entry?.values ?? []
}

async function getOfferFormCatalogsServer(): Promise<CrearOfertaCatalogs> {
  try {
    const cookie = (await headers()).get("cookie") ?? undefined

    const [offersCatalogs, parameters, states, cities, categoriesResult, companyConfig] = await Promise.all([
      getAdminOffersCatalogsServer(cookie),
      readJsonFile<JobParameter[]>("job_parameters.json"),
      readJsonFile<StateItem[]>("state.json"),
      readJsonFile<CityItem[]>("city.json"),
      getAdminCategoriesServer({ page: 1, pageSize: 100 }, cookie),
      getCompanyConfigServer(cookie),
    ])

    const categories: CategoryOption[] = categoriesResult.items
      .map((category) => ({
        id: category.id,
        name: category.name.trim(),
      }))
      .filter((category) => Number.isFinite(category.id) && category.id > 0 && category.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    const companyState = companyConfig.initialData.state.trim()
    const companyCity = companyConfig.initialData.city.trim()

    const fixedStateId = states.find((state) => state.name === companyState)?.id

    if (!fixedStateId) {
      throw new Error("No se encontro el estado de la company en el catalogo")
    }

    const cityOptionsByState = Array.from(
      new Set(
        cities
          .filter((city) => city.state_id === fixedStateId)
          .map((city) => city.name.trim())
          .filter((cityName) => cityName.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))

    const cityOptions = Array.from(new Set([...cityOptionsByState, companyCity])).sort((a, b) =>
      a.localeCompare(b)
    )

    const stateOptions = Array.from(
      new Set(
        [
          ...offersCatalogs.states,
          ...states.map((state) => state.name.trim()),
          companyState,
        ].filter((stateName) => stateName.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b))

    return {
      statuses: getParameterOptions(parameters, "status"),
      workplaceTypes: getParameterOptions(parameters, "workplace_type"),
      employmentTypes: getParameterOptions(parameters, "employment_type"),
      categories,
      stateOptions,
      fixedLocation: {
        state: companyState,
      },
      cityOptions,
      technicalSkillOptions: offersCatalogs.technical_skills,
      softSkillOptions: offersCatalogs.soft_skills,
    }
  } catch {
    return {
      statuses: [
        { technical_name: "draft", display_name: "Borrador" },
        { technical_name: "published", display_name: "Publicado" },
        { technical_name: "closed", display_name: "Cerrado" },
      ],
      workplaceTypes: [
        { technical_name: "onsite", display_name: "Presencial" },
        { technical_name: "remote", display_name: "Remoto" },
        { technical_name: "hybrid", display_name: "Hibrido" },
      ],
      employmentTypes: [
        { technical_name: "full_time", display_name: "Tiempo completo" },
        { technical_name: "part_time", display_name: "Medio tiempo" },
        { technical_name: "contract", display_name: "Contrato" },
        { technical_name: "internship", display_name: "Pasantía" },
      ],
      categories: [{ id: 1, name: "Tecnologia" }],
      stateOptions: ["Carabobo"],
      fixedLocation: {
        state: "Carabobo",
      },
      cityOptions: ["Valencia"],
      technicalSkillOptions: ["SQL", "Python", "Power BI"],
      softSkillOptions: ["Comunicacion", "Pensamiento critico", "Trabajo en equipo"],
    }
  }
}

export default async function AdminOfertaDetallePage({
  params,
  searchParams,
}: AdminOfertaDetallePageProps) {
  const cookie = (await headers()).get("cookie") ?? undefined
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const offerId = Number(resolvedParams.id)

  if (!Number.isFinite(offerId)) {
    notFound()
  }

  const initialCandidatesQuery = normalizeAdminOfferCandidatesQuery({
    search: Array.isArray(resolvedSearchParams?.search)
      ? resolvedSearchParams?.search[0]
      : resolvedSearchParams?.search,
    technical_min: Array.isArray(resolvedSearchParams?.technical_min)
      ? resolvedSearchParams?.technical_min[0]
      : resolvedSearchParams?.technical_min,
    technical_max: Array.isArray(resolvedSearchParams?.technical_max)
      ? resolvedSearchParams?.technical_max[0]
      : resolvedSearchParams?.technical_max,
    soft_min: Array.isArray(resolvedSearchParams?.soft_min)
      ? resolvedSearchParams?.soft_min[0]
      : resolvedSearchParams?.soft_min,
    soft_max: Array.isArray(resolvedSearchParams?.soft_max)
      ? resolvedSearchParams?.soft_max[0]
      : resolvedSearchParams?.soft_max,
    culture_min: Array.isArray(resolvedSearchParams?.culture_min)
      ? resolvedSearchParams?.culture_min[0]
      : resolvedSearchParams?.culture_min,
    culture_max: Array.isArray(resolvedSearchParams?.culture_max)
      ? resolvedSearchParams?.culture_max[0]
      : resolvedSearchParams?.culture_max,
    final_min: Array.isArray(resolvedSearchParams?.final_min)
      ? resolvedSearchParams?.final_min[0]
      : resolvedSearchParams?.final_min,
    final_max: Array.isArray(resolvedSearchParams?.final_max)
      ? resolvedSearchParams?.final_max[0]
      : resolvedSearchParams?.final_max,
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

  const [detailResult, formCatalogs, candidateStatusOptions, initialCandidatesData] =
    await Promise.all([
      getAdminOfferDetailServer(offerId, cookie),
      getOfferFormCatalogsServer(),
      getApplicationStatusOptionsServer(),
      getAdminOfferCandidatesServer(offerId, initialCandidatesQuery, cookie),
    ])

  if (!detailResult) {
    notFound()
  }

  return (
    <OfertaAdminDetalleClient
      offerId={offerId}
      offer={detailResult.offer}
      statusDisplayName={detailResult.status_display_name}
      formCatalogs={formCatalogs}
      candidateStatusOptions={candidateStatusOptions}
      initialCandidatesQuery={initialCandidatesQuery}
      initialCandidatesData={initialCandidatesData}
    />
  )
}
