"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "../../../auth-client"
import { BriefcaseBusiness, ClipboardList, LogOut, UserRound, UsersRound } from "lucide-react"
import { useCandidateSession } from "react/hooks/use-segmented-session"

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
    const { user, isPending } = useCandidateSession()
    const { company } = useCompany()

    const isAuthResolved = !isPending
    const userName = user?.name ?? "Usuario"
    const userEmail = user?.email ?? ""
    const userImage = user?.image ?? undefined
    const resolvedCompanyName = company?.name ?? "Acme Corp"
    const resolvedLogoSrc = company?.logo ?? "https://i.pravatar.cc/100?img=1"

    return (
        <SidebarProvider className="bg-background">
            <Sidebar collapsible="offcanvas" variant="inset" className="border-border/70 bg-sidebar/90">
                <SidebarHeader>
                    <div className="gradient-border flex items-center gap-3 rounded-xl px-3 py-2 shadow-soft">
                        <Link href="/" className="flex items-center gap-3">
                            {resolvedLogoSrc ? (
                                <img
                                    src={resolvedLogoSrc}
                                    alt={`${resolvedCompanyName} logo`}
                                    className="h-8 w-8 rounded-lg border border-border/70 object-contain"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-soft">
                                    {resolvedCompanyName.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
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
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(item.href)}
                                            className="rounded-xl text-muted-foreground transition-colors duration-[240ms] hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground data-[active=true]:shadow-soft"
                                        >
                                            <Link href={item.href}>
                                                <item.icon aria-hidden="true" />
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
                    {!isAuthResolved ? (
                        <div className="flex items-center gap-3 rounded-md px-2 py-1">
                            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-2 py-2 shadow-soft">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={userImage} alt={userName} />
                                <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{userName}</p>
                                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full justify-start rounded-xl border-border/70 bg-background/80 hover:border-primary/45 hover:bg-muted/80"
                        onClick={() => {
                            void (async () => {
                                document.cookie = "ats_scope=; Path=/; Max-Age=0; SameSite=Lax"
                                await signOut()
                                window.location.href = "/"
                            })()
                        }}
                    >
                        <LogOut aria-hidden="true" className="mr-2 size-4" />
                        Logout
                    </Button>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="bg-background/85">{children}</SidebarInset>
        </SidebarProvider>
    )
}

