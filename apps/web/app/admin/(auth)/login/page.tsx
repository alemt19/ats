import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getAdminAccess, getSession } from "../../../../auth"
import { getDefaultAdminRoute } from "react/lib/admin-role"
import AdminLoginClientPage from "./login-client"

export default async function AdminLoginPage() {
	const session = await getSession()
	const cookieStore = await cookies()
	const sessionScope = cookieStore.get("ats_scope")?.value

	if (session?.user && sessionScope === "admin") {
		const adminAccess = await getAdminAccess()

		if (adminAccess) {
			redirect(getDefaultAdminRoute(adminAccess.adminRole ?? adminAccess.adminProfile.role))
		}
	}

	return <AdminLoginClientPage />
}
