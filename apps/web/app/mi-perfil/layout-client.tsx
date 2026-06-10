"use client"

import { usePathname } from "next/navigation"

import SidebarClient from "../../react/components/layout/sidebar-client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "react/components/ui/breadcrumb"
import NotificationsPanel from "react/components/layout/notifications-panel"
import { SidebarTrigger } from "react/components/ui/sidebar"
import type { UserNotification } from "react/lib/notifications"

function getBreadcrumbLabel(pathname: string) {
    if (pathname === "/mi-perfil/panel-de-control") {
        return "Panel de control"
    }

    if (pathname === "/mi-perfil/competencias-valores") {
        return "Competencias y valores"
    }

    if (pathname === "/mi-perfil/credenciales-experiencias") {
        return "Credenciales y experiencias"
    }

    if (
        pathname === "/mi-perfil/mis-datos/preferencias-culturales" ||
        pathname === "/mi-perfil/preferencias-culturales"
    ) {
        return "Preferencias culturales"
    }

    if (pathname === "/mi-perfil/mis-datos" || pathname === "/mi-perfil") {
        return "Mis datos"
    }

    if (pathname === "/mi-perfil/postulaciones") {
        return "Mis Postulaciones"
    }

    if (pathname === "/mi-perfil/notificaciones") {
        return "Notificaciones"
    }

    return "Mis datos"
}

type LayoutClientProps = {
    children: React.ReactNode
    notifications: UserNotification[]
    unreadCount: number
}

export default function LayoutClient({ children, notifications, unreadCount }: LayoutClientProps) {
    const pathname = usePathname()
    const currentPage = getBreadcrumbLabel(pathname)

    return (
        <SidebarClient>
            <div className="content-space flex min-h-dvh flex-col gap-3">
                <header className="sticky top-[calc(0.5rem+var(--space-content))] z-30 flex h-12 items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-3.5 shadow-soft backdrop-blur-md">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <SidebarTrigger className="shrink-0" />
                        <Breadcrumb className="min-w-0 overflow-hidden">
                            <BreadcrumbList className="min-w-0 flex-nowrap gap-x-1.5 gap-y-1">
                                <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
                                    <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden shrink-0 sm:block" />
                                <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
                                    <BreadcrumbLink href="/mi-perfil">Mi perfil</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden shrink-0 sm:block" />
                                <BreadcrumbItem className="min-w-0">
                                    <BreadcrumbPage className="truncate">{currentPage}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="ml-auto shrink-0">
                        <NotificationsPanel
                            notifications={notifications}
                            unreadCount={unreadCount}
                            scope="candidate"
                        />
                    </div>
                </header>

                <main className="flex-1">{children}</main>
            </div>
        </SidebarClient>
    )
}
