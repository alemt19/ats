import "server-only"

import {
  type AdminCategoriesQueryParams,
  type AdminCategoriesResponse,
  type AdminCategory,
  normalizeAdminCategoriesQuery,
} from "./categories-admin-types"

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function normalizeDummyCategories(payload: unknown): AdminCategory[] {
  if (!Array.isArray(payload)) {
    return []
  }

  const names = payload
    .map((item) => {
      if (typeof item === "string") {
        const normalized = item.trim()
        return normalized ? humanizeSlug(normalized) : null
      }

      if (!item || typeof item !== "object") {
        return null
      }

      const category = item as {
        slug?: unknown
        name?: unknown
        id?: unknown
      }

      const rawName = category.name ?? category.slug ?? category.id
      const name = typeof rawName === "string" ? rawName.trim() : ""

      if (!name) {
        return null
      }

      return humanizeSlug(name)
    })
    .filter((value): value is string => Boolean(value))

  const deduped = Array.from(new Set(names.map((name) => name.toLowerCase()))).map((normalizedName) => {
    const found = names.find((name) => name.toLowerCase() === normalizedName) ?? normalizedName
    return found
  })

  return deduped
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((name, index) => ({
      id: index + 1,
      name,
    }))
}

async function fetchAllCategories(): Promise<AdminCategory[]> {
  const response = await fetch("https://dummyjson.com/products/categories", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("No se pudieron obtener las categorías")
  }

  const payload = (await response.json()) as unknown
  return normalizeDummyCategories(payload)
}

function applyFilters(
  categories: AdminCategory[],
  query: AdminCategoriesQueryParams
): AdminCategoriesResponse {
  const normalizedName = query.name.toLowerCase()

  const filtered = categories.filter((category) => {
    if (!normalizedName) {
      return true
    }

    return category.name.toLowerCase().includes(normalizedName)
  })

  const total = filtered.length
  const start = (query.page - 1) * query.pageSize

  return {
    items: filtered.slice(start, start + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getAdminCategoriesServer(
  queryInput?: Partial<Record<keyof AdminCategoriesQueryParams, string | number | undefined>>
): Promise<AdminCategoriesResponse> {
  const query = normalizeAdminCategoriesQuery(queryInput)

  try {
    const categories = await fetchAllCategories()
    return applyFilters(categories, query)
  } catch {
    return applyFilters(
      [
        { id: 1, name: "Tecnología" },
        { id: 2, name: "Marketing" },
      ],
      query
    )
  }
}

export async function getAdminCategoryByIdServer(categoryId: number) {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return null
  }

  try {
    const categories = await fetchAllCategories()
    return categories.find((category) => category.id === categoryId) ?? null
  } catch {
    return {
      id: categoryId,
      name: `Categoría ${categoryId}`,
    }
  }
}

export async function createAdminCategoryServer(name: string): Promise<AdminCategory> {
  const normalizedName = name.trim()

  if (!normalizedName) {
    throw new Error("El nombre es requerido")
  }

  try {
    const response = await fetch("https://dummyjson.com/products/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: normalizedName }),
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("No se pudo crear la categoría")
    }

    const payload = (await response.json()) as { id?: number | string; title?: string }
    const numericPayloadId = Number(payload.id)

    return {
      id: Number.isFinite(numericPayloadId) && numericPayloadId > 0 ? numericPayloadId : Date.now(),
      name: (payload.title ?? normalizedName).trim(),
    }
  } catch {
    return {
      id: Date.now(),
      name: normalizedName,
    }
  }
}

export async function updateAdminCategoryServer(
  categoryId: number,
  name: string
): Promise<AdminCategory> {
  const normalizedName = name.trim()

  if (!Number.isFinite(categoryId) || categoryId <= 0 || !normalizedName) {
    throw new Error("Datos inválidos")
  }

  try {
    const response = await fetch(`https://dummyjson.com/products/${categoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: normalizedName }),
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("No se pudo editar la categoría")
    }

    const payload = (await response.json()) as { title?: string }

    return {
      id: categoryId,
      name: (payload.title ?? normalizedName).trim(),
    }
  } catch {
    return {
      id: categoryId,
      name: normalizedName,
    }
  }
}
