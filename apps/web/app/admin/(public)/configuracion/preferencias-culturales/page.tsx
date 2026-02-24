import { auth } from "../../../../../auth"
import type {
	CulturePreferenceCategory,
} from "../company-config-bootstrap"
import {
	fetchCompanyConfigBootstrap,
	readJsonFile,
} from "../company-config-bootstrap"
import PreferenciasCulturalesForm from "./preferencias-culturales-form"

export default async function AdminConfiguracionPreferenciasCulturalesPage() {
	const session = await auth()
	const userId = session?.user?.id ?? "admin_123"
	const accessToken = session?.accessToken

	const [cultureCategories, bootstrapData] = await Promise.all([
		readJsonFile<CulturePreferenceCategory[]>("culture_preference.json"),
		fetchCompanyConfigBootstrap(userId, accessToken),
	])

	return (
		<PreferenciasCulturalesForm
			userId={userId}
			initialData={bootstrapData.initialData}
			cultureCategories={cultureCategories}
		/>
	)
}
