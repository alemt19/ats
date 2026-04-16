"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "../../../auth-client"
import {
	LayoutDashboard,
	BriefcaseBusiness,
	Users,
	UserSearch,
	Tags,
	Settings,
	UserRound,
	LogOut,
	ChevronRight,
} from "lucide-react"

import { useCompany } from "react/contexts/company-context"
import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { getDefaultAdminRoute, isHeadOfRecruiters } from "react/lib/admin-role"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "react/components/ui/breadcrumb"
import { Button } from "react/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "react/components/ui/collapsible"
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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
} from "react/components/ui/sidebar"
import { Skeleton } from "react/components/ui/skeleton"
import { useAdminSession } from "react/hooks/use-segmented-session"
import NotificationsPanel from "react/components/layout/notifications-panel"
import type { UserNotification } from "react/lib/notifications"

const adminLinks = [
	{
		label: "Panel de control",
		href: "/admin/dashboard",
		icon: LayoutDashboard,
		headOnly: true,
	},
	{
		label: "Ofertas",
		href: "/admin/ofertas",
		icon: BriefcaseBusiness,
	},
	{
		label: "Reclutadores",
		href: "/admin/reclutadores",
		icon: Users,
		headOnly: true,
	},
	{
		label: "Candidatos",
		href: "/admin/candidatos",
		icon: UserSearch,
	},
	{
		label: "Categorías",
		href: "/admin/categorias",
		icon: Tags,
	},
	{
		label: "Mi perfil",
		href: "/admin/mi-perfil",
		icon: UserRound,
	},
]

function getAdminBreadcrumbLabel(pathname: string) {
	if (pathname.startsWith("/admin/dashboard")) {
		return "Panel de control"
	}

	if (pathname.startsWith("/admin/ofertas")) {
		return "Ofertas"
	}

	if (pathname.startsWith("/admin/reclutadores")) {
		return "Reclutadores"
	}

	if (pathname.startsWith("/admin/candidatos")) {
		return "Candidatos"
	}

	if (pathname.startsWith("/admin/categorias")) {
		return "Categorías"
	}

	if (pathname.startsWith("/admin/configuracion")) {
		return "Configuración"
	}

	if (pathname.startsWith("/admin/configuracion/informacion-valores")) {
		return "Información y Valores"
	}

	if (pathname.startsWith("/admin/configuracion/preferencias-culturales")) {
		return "Preferencias Culturales"
	}

	if (pathname.startsWith("/admin/mi-perfil")) {
		return "Mi perfil"
	}

	if (pathname.startsWith("/admin/notificaciones")) {
		return "Notificaciones"
	}

	return "Panel de control"
}

function getAdminBreadcrumbItems(pathname: string) {
	if (pathname.startsWith("/admin/configuracion/informacion-valores")) {
		return [
			{ label: "Configuración" },
			{ label: "Información y Valores" },
		]
	}

	if (pathname.startsWith("/admin/configuracion/preferencias-culturales")) {
		return [
			{ label: "Configuración" },
			{ label: "Preferencias Culturales" },
		]
	}

	if (pathname.startsWith("/admin/ofertas/crear")) {
		return [
			{ label: "Ofertas", href: "/admin/ofertas" },
			{ label: "Crear" },
		]
	}

	if (pathname.startsWith("/admin/reclutadores/crear/email-verification")) {
		return [
			{ label: "Reclutadores", href: "/admin/reclutadores" },
			{ label: "Crear", href: "/admin/reclutadores/crear" },
			{ label: "Verificación de correo" },
		]
	}

	if (pathname.startsWith("/admin/reclutadores/crear")) {
		return [
			{ label: "Reclutadores", href: "/admin/reclutadores" },
			{ label: "Crear" },
		]
	}

	if (pathname.startsWith("/admin/categorias/crear")) {
		return [
			{ label: "Categorías", href: "/admin/categorias" },
			{ label: "Crear" },
		]
	}

	const recruiterDetailMatch = pathname.match(/^\/admin\/reclutadores\/([^/]+)/)

	if (recruiterDetailMatch && recruiterDetailMatch[1]) {
		return [
			{ label: "Reclutadores", href: "/admin/reclutadores" },
			{ label: recruiterDetailMatch[1] },
		]
	}

	const adminCandidateDetailMatch = pathname.match(/^\/admin\/candidatos\/([^/]+)/)

	if (adminCandidateDetailMatch && adminCandidateDetailMatch[1]) {
		return [
			{ label: "Candidatos", href: "/admin/candidatos" },
			{ label: adminCandidateDetailMatch[1] },
		]
	}

	const categoryDetailMatch = pathname.match(/^\/admin\/categorias\/([^/]+)/)

	if (categoryDetailMatch && categoryDetailMatch[1]) {
		return [
			{ label: "Categorías", href: "/admin/categorias" },
			{ label: categoryDetailMatch[1] },
		]
	}

	const candidateDetailMatch = pathname.match(/^\/admin\/ofertas\/([^/]+)\/candidatos\/([^/]+)/)

	if (candidateDetailMatch && candidateDetailMatch[1] && candidateDetailMatch[2]) {
		const offerId = candidateDetailMatch[1]
		const candidateId = candidateDetailMatch[2]

		return [
			{ label: "Oferta", href: "/admin/ofertas" },
			{ label: offerId, href: `/admin/ofertas/${offerId}` },
			{ label: "Candidatos" },
			{ label: candidateId },
		]
	}

	const offerDetailMatch = pathname.match(/^\/admin\/ofertas\/([^/]+)/)

	if (offerDetailMatch && offerDetailMatch[1]) {
		return [
			{ label: "Ofertas", href: "/admin/ofertas" },
			{ label: offerDetailMatch[1] },
		]
	}

	return [{ label: getAdminBreadcrumbLabel(pathname) }]
}

type AdminPublicLayoutClientProps = {
	children: React.ReactNode
	notifications: UserNotification[]
	unreadCount: number
}

export default function AdminPublicLayoutClient({
	children,
	notifications,
	unreadCount,
}: AdminPublicLayoutClientProps) {
	const pathname = usePathname()
	const { user, isPending: isAdminPending } = useAdminSession()
	const { company, isLoading: isCompanyLoading } = useCompany()
	const isSidebarIdentityLoading = isAdminPending || isCompanyLoading

	const fullNameValue = user?.name ?? ""
	const [firstNamePart, ...lastNameParts] = fullNameValue.trim().split(/\s+/).filter(Boolean)
	const firstName = firstNamePart ?? "Administrador"
	const lastName = lastNameParts.join(" ") || "Usuario"
	const fullName = `${firstName} ${lastName}`.trim()
	const adminEmail = user?.email ?? "admin@empresa.com"
	const adminImage = user?.image ?? undefined

	const companyName = company?.name ?? "ATS"
	const companyLogo = company?.logo
	const adminRole = user?.role ?? null
	const defaultAdminRoute = getDefaultAdminRoute(adminRole)
	const visibleAdminLinks = adminLinks.filter((item) => !item.headOnly || isHeadOfRecruiters(adminRole))
	const breadcrumbItems = getAdminBreadcrumbItems(pathname)
	const isConfigurationSection =
		pathname.startsWith("/admin/configuracion/informacion-valores") ||
		pathname.startsWith("/admin/configuracion/preferencias-culturales")

	return (
		<SidebarProvider className="bg-background">
			<a
				href="#admin-main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
			>
				Saltar al contenido principal
			</a>
			<Sidebar collapsible="offcanvas" variant="inset" className="border-border/70 bg-sidebar/90">
				<SidebarHeader>
					<div className="gradient-border flex items-center gap-3 rounded-xl px-3 py-2 shadow-soft">
						{isSidebarIdentityLoading ? (
							<div className="flex items-center gap-3">
								<Skeleton className="h-8 w-8 rounded-md" />
								<Skeleton className="h-5 w-28" />
							</div>
						) : (
							<Link href={defaultAdminRoute} className="flex items-center gap-3">
								{companyLogo ? (
									<img
										src={companyLogo}
										alt={`${companyName} logo`}
										className="h-8 w-8 rounded-lg border border-border/70 object-contain"
									/>
								) : (
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-soft">
										{companyName.slice(0, 2).toUpperCase()}
									</div>
								)}
								<span className="font-display text-base font-semibold tracking-tight">
									{companyName}
								</span>
							</Link>
						)}
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{visibleAdminLinks.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={pathname.startsWith(item.href)}
											className="rounded-xl text-muted-foreground transition-colors duration-240 hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground data-[active=true]:shadow-soft"
										>
											<Link href={item.href}>
												<item.icon aria-hidden="true" />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}

								<Collapsible defaultOpen={isConfigurationSection} className="group/collapsible">
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton
												isActive={isConfigurationSection}
												className="rounded-xl text-muted-foreground transition-colors duration-240 hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground data-[active=true]:shadow-soft"
											>
												<Settings aria-hidden="true" />
												<span>Configuración</span>
												<ChevronRight
													aria-hidden="true"
													className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90"
												/>
											</SidebarMenuButton>
										</CollapsibleTrigger>

										<CollapsibleContent>
											<SidebarMenuSub>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton
														asChild
														isActive={pathname.startsWith("/admin/configuracion/informacion-valores")}
														className="rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground"
													>
														<Link href="/admin/configuracion/informacion-valores">
															<span>Información y Valores</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>

												<SidebarMenuSubItem>
													<SidebarMenuSubButton
														asChild
														isActive={pathname.startsWith("/admin/configuracion/preferencias-culturales")}
														className="rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground"
													>
														<Link href="/admin/configuracion/preferencias-culturales">
															<span>Preferencias Culturales</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarSeparator />

				<SidebarFooter>
					{isSidebarIdentityLoading ? (
						<>
							<div className="flex items-center gap-3 rounded-md px-2 py-1">
								<Skeleton className="h-9 w-9 rounded-full" />
								<div className="min-w-0 flex-1 space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-36" />
								</div>
							</div>
							<Skeleton className="h-9 w-full" />
						</>
					) : (
						<>
							<div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-2 py-2 shadow-soft">
								<Avatar className="h-9 w-9">
									<AvatarImage src={adminImage} alt={fullName} />
									<AvatarFallback>{fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{fullName}</p>
									<p className="truncate text-xs text-muted-foreground">{adminEmail}</p>
								</div>
							</div>

							<Button
								variant="outline"
								className="w-full justify-start rounded-xl border-border/70 bg-background/80 hover:border-primary/45 hover:bg-muted/80"
								onClick={() => {
									void (async () => {
										document.cookie = "ats_scope=; Path=/; Max-Age=0; SameSite=Lax"
										await signOut()
										window.location.href = "/login"
									})()
								}}
							>
								<LogOut aria-hidden="true" className="mr-2 size-4" />
								Cerrar sesión
							</Button>
						</>
					)}
				</SidebarFooter>
			</Sidebar>

			<SidebarInset className="bg-background/85">
				<div className="content-space flex min-h-dvh flex-col gap-3">
					<header className="sticky top-3 z-30 flex h-12 items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-3.5 shadow-soft backdrop-blur-md">
						<SidebarTrigger />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink href={defaultAdminRoute}>Administración</BreadcrumbLink>
								</BreadcrumbItem>
								{breadcrumbItems.map((item, index) => {
									const isLast = index === breadcrumbItems.length - 1

									return (
										<div key={`${item.label}-${index}`} className="contents">
											<BreadcrumbSeparator />
											<BreadcrumbItem>
												{!isLast && item.href ? (
													<BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
												) : (
													<BreadcrumbPage>{item.label}</BreadcrumbPage>
												)}
											</BreadcrumbItem>
										</div>
									)
								})}
							</BreadcrumbList>
						</Breadcrumb>

						<div className="ml-auto">
							<NotificationsPanel
								notifications={notifications}
								unreadCount={unreadCount}
								scope="admin"
							/>
						</div>
					</header>

					<main id="admin-main-content" className="flex-1" tabIndex={-1}>
						{children}
					</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}

