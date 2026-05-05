import { getSession } from "../../../auth"
import { headers } from "next/headers"

import CredencialesExperienciasForm from "./credenciales-experiencias-form"
import { fetchProfileDataServer } from "../profile-data"

export default async function CredencialesExperienciasPage() {
  const session = await getSession()
  const cookie = (await headers()).get("cookie") ?? ""
  const profileData = await fetchProfileDataServer(cookie)

  if (!session?.user?.id) {
    return null
  }

  return (
    <CredencialesExperienciasForm
      initialData={profileData.initialData}
      credentialOptions={profileData.credentialOptions}
    />
  )
}
