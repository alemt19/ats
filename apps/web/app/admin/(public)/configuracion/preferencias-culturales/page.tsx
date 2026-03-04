import { getSession } from "../../../../../auth"
import { headers } from "next/headers"
import type {
	CulturePreferenceCategory,
} from "../company-config-bootstrap"
import {
	fetchCompanyConfigBootstrap,
	readJsonFile,
} from "../company-config-bootstrap"
import PreferenciasCulturalesForm from "./preferencias-culturales-form"

export default async function AdminConfiguracionPreferenciasCulturalesPage() {
	const session = await getSession()
	const userId = session?.user?.id ?? "admin_123"
	const accessToken = session?.accessToken
	const cookie = (await headers()).get("cookie") ?? undefined

	const [cultureCategories, bootstrapData] = await Promise.all([
		readJsonFile<CulturePreferenceCategory[]>("culture_preference.json"),
		fetchCompanyConfigBootstrap(userId, accessToken, cookie),
	])

	return (
		<PreferenciasCulturalesForm
			userId={userId}
			initialData={bootstrapData.initialData}
			cultureCategories={cultureCategories}
		/>
	)
}
