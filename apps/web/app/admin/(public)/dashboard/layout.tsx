import { redirect } from "next/navigation"

import { getAdminAccess } from "../../../../auth"

export default async function AdminDashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const adminAccess = await getAdminAccess()

	if (!adminAccess) {
		redirect("/admin/ofertas")
	}

	return children
}