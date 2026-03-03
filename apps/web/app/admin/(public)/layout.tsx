import { redirect } from "next/navigation"

import { hasAuthAccess } from "../../../auth"
import AdminPublicLayoutClient from "./layout-client"

export default async function AdminPublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const canAccessAdminArea = await hasAuthAccess("admin")
	console.log("canAccessAdminArea", canAccessAdminArea)
	if (!canAccessAdminArea) {
		redirect("/admin/login")
	}

	return <AdminPublicLayoutClient>{children}</AdminPublicLayoutClient>
}
