import { redirect } from "next/navigation"

import { getAdminAccess, getSession } from "../../auth"
import { getDefaultAdminRoute } from "react/lib/admin-role"

export default async function AdminRootPage() {
	const session = await getSession()

	if (session?.user) {
		const adminAccess = await getAdminAccess()

		if (adminAccess) {
			redirect(getDefaultAdminRoute(adminAccess.adminRole ?? adminAccess.adminProfile.role))
		}
	}

	redirect("/admin/login")
}
