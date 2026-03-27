import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { hasAuthAccess } from "../../../auth"
import AdminPublicLayoutClient from "./layout-client"
import { fetchMyNotificationsServer } from "react/lib/notifications"

export default async function AdminPublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const canAccessAdminArea = await hasAuthAccess("admin")
	if (!canAccessAdminArea) {
		redirect("/admin/login")
	}

	const cookie = (await headers()).get("cookie") ?? ""
	const notifications = await fetchMyNotificationsServer(cookie)

	return (
		<AdminPublicLayoutClient
			notifications={notifications.items}
			unreadCount={notifications.unreadCount}
		>
			{children}
		</AdminPublicLayoutClient>
	)
}
