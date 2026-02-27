"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "../../../auth-client"
import { BriefcaseBusiness, ClipboardList, LogOut, UserRound, UsersRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { useCompany } from "react/contexts/company-context"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
} from "../ui/sidebar"

const profileLinks = [
    {
        label: "Mis datos",
        href: "/mi-perfil/mis-datos",
        icon: UserRound,
    },
    {
        label: "Competencias y valores",
        href: "/mi-perfil/competencias-valores",
        icon: BriefcaseBusiness,
    },
    {
        label: "Preferencias culturales",
        href: "/mi-perfil/preferencias-culturales",
        icon: UsersRound,
    },
    {
        label: "Mis postulaciones",
        href: "/mi-perfil/postulaciones",
        icon: ClipboardList
    }
]

type SidebarClientProps = {
    children: React.ReactNode
}

export default function SidebarClient({ children }: SidebarClientProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { company } = useCompany()

    const userName = session?.user?.name ?? "Carla Lopez"
    const userEmail = session?.user?.email ?? "carla.lopez@ejemplo.com"
    const userImage = session?.user?.image ?? "https://i.pravatar.cc/100?img=32"
    const resolvedCompanyName = company?.name ?? "Acme Corp"
    const resolvedLogoSrc = company?.logo ?? "https://i.pravatar.cc/100?img=1"

    return (
        <SidebarProvider>
            <Sidebar collapsible="offcanvas">
                <SidebarHeader>
                    <div className="flex items-center gap-3 rounded-md px-2 py-1">
                        <Link href="/" className="flex items-center gap-3">
                            {resolvedLogoSrc ? (
                                <img
                                    src={resolvedLogoSrc}
                                    alt={`${resolvedCompanyName} logo`}
                                    className="h-8 w-8 rounded-md object-contain"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                                    {resolvedCompanyName.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="text-base font-semibold tracking-tight">
                                {resolvedCompanyName}
                            </span>
                        </Link>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {profileLinks.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={pathname === item.href}>
                                            <Link href={item.href}>
                                                <item.icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarSeparator />

                <SidebarFooter>
                    <div className="flex items-center gap-3 rounded-md px-2 py-1">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={userImage} alt={userName} />
                            <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{userName}</p>
                            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                            void (async () => {
                                await signOut()
                                window.location.href = "/"
                            })()
                        }}
                    >
                        <LogOut className="mr-2 size-4" />
                        Logout
                    </Button>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

