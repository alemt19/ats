import { headers } from "next/headers"
import { notFound } from "next/navigation"

import GenericJobDescriptionForm from "../generic-job-description-form"
import { getAdminGenericJobDescriptionByIdServer } from "../generic-job-descriptions-admin-service"

type AdminDescripcionOfertaDetallePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminDescripcionOfertaDetallePage({ params }: AdminDescripcionOfertaDetallePageProps) {
  const resolvedParams = await params
  const descriptionId = Number(resolvedParams.id)

  if (!Number.isFinite(descriptionId) || descriptionId <= 0) {
    notFound()
  }

  const cookie = (await headers()).get("cookie") ?? undefined
  const description = await getAdminGenericJobDescriptionByIdServer(descriptionId, cookie)

  if (!description) {
    notFound()
  }

  return (
    <GenericJobDescriptionForm
      mode="edit"
      descriptionId={description.id}
      initialPosition={description.position}
      initialDescription={description.description}
    />
  )
}