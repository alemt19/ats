"use client"

import { usePathname } from "next/navigation"

import SidebarClient from "../../react/components/layout/sidebar-client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "react/components/ui/breadcrumb"
import { SidebarTrigger } from "react/components/ui/sidebar"

function getBreadcrumbLabel(pathname: string) {
    if (pathname === "/mi-perfil/competencias-valores") {
        return "Competencias y valores"
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

    return "Mis datos"
}

type LayoutClientProps = {
    children: React.ReactNode
}

export default function LayoutClient({ children }: LayoutClientProps) {
    const pathname = usePathname()
    const currentPage = getBreadcrumbLabel(pathname)

    return (
        <SidebarClient>
            <div className="content-space flex min-h-dvh flex-col gap-3">
                <header className="sticky top-3 z-30 flex h-12 items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-3.5 shadow-soft backdrop-blur-md">
                    <SidebarTrigger />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Home</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/mi-perfil">Mi perfil</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <main className="flex-1">{children}</main>
            </div>
        </SidebarClient>
    )
}
