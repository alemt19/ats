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
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
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
            <main className="p-4 sm:p-6">{children}</main>
        </SidebarClient>
    )
}
