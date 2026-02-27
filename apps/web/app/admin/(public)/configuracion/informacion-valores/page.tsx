import { getSession } from "../../../../../auth"
import type {
	AdminCompanyConfigInitialData,
	CityRecord,
	CountryRecord,
	StateRecord,
} from "../company-config-bootstrap"
import {
	FIXED_COUNTRY_NAME,
	FIXED_STATE_NAME,
	fetchCompanyConfigBootstrap,
	getFixedCityOptions,
	readJsonFile,
} from "../company-config-bootstrap"
import InformacionValoresForm from "./informacion-valores-form"

export default async function AdminConfiguracionInformacionValoresPage() {
	const session = await getSession()
	const userId = session?.user?.id ?? "admin_123"
	const accessToken = session?.accessToken

	const [countries, states, cities, bootstrapData] = await Promise.all([
		readJsonFile<CountryRecord[]>("country.json"),
		readJsonFile<StateRecord[]>("state.json"),
		readJsonFile<CityRecord[]>("city.json"),
		fetchCompanyConfigBootstrap(userId, accessToken),
	])

	const cityOptions = getFixedCityOptions(countries, states, cities)

	const fixedCity = cityOptions.includes(bootstrapData.initialData.city)
		? bootstrapData.initialData.city
		: cityOptions[0] ?? ""

	const initialData: AdminCompanyConfigInitialData = {
		...bootstrapData.initialData,
		country: FIXED_COUNTRY_NAME,
		state: FIXED_STATE_NAME,
		city: fixedCity,
	}

	return (
		<InformacionValoresForm
			userId={userId}
			initialData={initialData}
			cityOptions={cityOptions}
			companyValueOptions={bootstrapData.companyValueOptions}
		/>
	)
}
