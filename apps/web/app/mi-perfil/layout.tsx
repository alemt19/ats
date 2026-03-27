import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { hasAuthAccess } from "../../auth"
import LayoutClient from "./layout-client"
import { fetchMyNotificationsServer } from "react/lib/notifications"

export default async function Layout({ children }: Readonly<{
    children: React.ReactNode
}>) {
    const canAccessCandidateArea = await hasAuthAccess("candidate")
    if (!canAccessCandidateArea) {
        redirect("/login")
    }

    const cookie = (await headers()).get("cookie") ?? ""
    const notifications = await fetchMyNotificationsServer(cookie)

    return (
        <LayoutClient
            notifications={notifications.items}
            unreadCount={notifications.unreadCount}
        >
            {children}
        </LayoutClient>
    )
}