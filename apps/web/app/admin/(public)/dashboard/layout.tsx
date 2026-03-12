import { redirect } from "next/navigation"

import { getAdminAccess } from "../../../../auth"
import { isHeadOfRecruiters } from "react/lib/admin-role"

export default async function AdminDashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const adminAccess = await getAdminAccess()

	if (!isHeadOfRecruiters(adminAccess?.adminRole ?? adminAccess?.adminProfile?.role ?? null)) {
		redirect("/admin/ofertas")
	}

	return children
}