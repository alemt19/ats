import { notFound } from "next/navigation"
import { headers } from "next/headers"

import { getAdminCategoryByIdServer } from "../categories-admin-service"
import CategoriaForm from "../categoria-form"

type AdminCategoriaDetallePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCategoriaDetallePage({ params }: AdminCategoriaDetallePageProps) {
  const resolvedParams = await params
  const categoryId = Number(resolvedParams.id)

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    notFound()
  }

  const cookie = (await headers()).get("cookie") ?? undefined
  const category = await getAdminCategoryByIdServer(categoryId, cookie)

  if (!category) {
    notFound()
  }

  return <CategoriaForm mode="edit" categoryId={category.id} initialName={category.name} />
}
