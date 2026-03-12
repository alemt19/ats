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

const adminLinks = [
	{
		label: "Dashboard",
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
		label: "Categorias",
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
		return "Dashboard"
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
		return "Categorias"
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

	return "Dashboard"
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
			{ label: "Categorias", href: "/admin/categorias" },
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
			{ label: "Categorias", href: "/admin/categorias" },
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
}

export default function AdminPublicLayoutClient({ children }: AdminPublicLayoutClientProps) {
	const pathname = usePathname()
	const { user, isPending: isAdminPending } = useAdminSession()
	const { company, isLoading: isCompanyLoading } = useCompany()
	const isSidebarIdentityLoading = isAdminPending || isCompanyLoading

	const fullNameValue = user?.name ?? ""
	const [firstNamePart, ...lastNameParts] = fullNameValue.trim().split(/\s+/).filter(Boolean)
	const firstName = firstNamePart ?? "Admin"
	const lastName = lastNameParts.join(" ") || "User"
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
		<SidebarProvider>
			<Sidebar collapsible="offcanvas">
				<SidebarHeader>
					<div className="flex items-center gap-3 rounded-md px-2 py-1">
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
										className="h-8 w-8 rounded-md object-contain"
									/>
								) : (
									<div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
										{companyName.slice(0, 2).toUpperCase()}
									</div>
								)}
								<span className="text-base font-semibold tracking-tight">{companyName}</span>
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
										<SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
											<Link href={item.href}>
												<item.icon />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}

								<Collapsible defaultOpen={isConfigurationSection} className="group/collapsible">
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton isActive={isConfigurationSection}>
												<Settings />
												<span>Configuración</span>
												<ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>

										<CollapsibleContent>
											<SidebarMenuSub>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton
														asChild
														isActive={pathname.startsWith("/admin/configuracion/informacion-valores")}
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
							<div className="flex items-center gap-3 rounded-md px-2 py-1">
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
								className="w-full justify-start"
								onClick={() => {
									void (async () => {
										document.cookie = "ats_scope=; Path=/; Max-Age=0; SameSite=Lax"
										await signOut()
										window.location.href = "/login"
									})()
								}}
							>
								<LogOut className="mr-2 size-4" />
								Logout
							</Button>
						</>
					)}
				</SidebarFooter>
			</Sidebar>

			<SidebarInset>
				<header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
					<SidebarTrigger />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href={defaultAdminRoute}>Admin</BreadcrumbLink>
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
				</header>

				<main className="p-4 sm:p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
