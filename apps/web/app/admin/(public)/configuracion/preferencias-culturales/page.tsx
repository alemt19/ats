import { getAdminAccess, getSession } from "../../../../../auth"
import { headers } from "next/headers"
import { canEditAdminConfiguration } from "react/lib/admin-role"
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
	const adminAccess = await getAdminAccess()
	const userId = session?.user?.id ?? "admin_123"
	const accessToken = session?.accessToken
	const cookie = (await headers()).get("cookie") ?? undefined
	const canEdit = canEditAdminConfiguration(adminAccess?.adminRole ?? adminAccess?.adminProfile?.role ?? null)

	const [cultureCategories, bootstrapData] = await Promise.all([
		readJsonFile<CulturePreferenceCategory[]>("culture_preference_company.json"),
		fetchCompanyConfigBootstrap(userId, accessToken, cookie),
	])

	return (
		<PreferenciasCulturalesForm
			userId={userId}
			initialData={bootstrapData.initialData}
			cultureCategories={cultureCategories}
			canEdit={canEdit}
		/>
	)
}
