import { auth } from "../../../../auth"

import MiPerfilForm from "./mi-perfil-form"
import {
	getAdminProfileCatalogsServer,
	getAdminProfileServer,
} from "./mi-perfil-service"

export default async function AdminMiPerfilPage() {
	const session = await auth()

	const [catalogs, profile] = await Promise.all([
		getAdminProfileCatalogsServer(),
		getAdminProfileServer({
			userId: session?.user?.id,
			userEmail: session?.user?.email ?? undefined,
			accessToken: session?.accessToken,
		}),
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
