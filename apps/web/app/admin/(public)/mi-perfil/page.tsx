import { headers } from "next/headers"

import MiPerfilForm from "./mi-perfil-form"
import {
	getAdminProfileCatalogsServer,
	getAdminProfileServer,
} from "./mi-perfil-service"

export default async function AdminMiPerfilPage() {
	const cookie = (await headers()).get("cookie") ?? undefined

	const [catalogs, profile] = await Promise.all([
		getAdminProfileCatalogsServer(),
		getAdminProfileServer(cookie),
	])

	if (!profile) {
		return (
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold">Mi perfil</h1>
				<p className="text-muted-foreground">No se pudo cargar la información del perfil.</p>
			</div>
		)
	}

	return <MiPerfilForm initialProfile={profile} catalogs={catalogs} />
}
