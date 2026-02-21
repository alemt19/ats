"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
	LayoutDashboard,
	BriefcaseBusiness,
	Users,
	Settings,
	UserRound,
	LogOut,
} from "lucide-react"

import { useCompany } from "react/contexts/company-context"
import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
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
	SidebarTrigger,
} from "react/components/ui/sidebar"

const adminLinks = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
		icon: LayoutDashboard,
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
	},
	{
		label: "Configuración",
		href: "/admin/configuracion",
		icon: Settings,
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

	if (pathname.startsWith("/admin/configuracion")) {
		return "Configuración"
	}

	if (pathname.startsWith("/admin/mi-perfil")) {
		return "Mi perfil"
	}

	return "Dashboard"
}

type AdminSessionUser = {
	name?: string | null
	lastname?: string | null
	lastName?: string | null
	email?: string | null
	image?: string | null
}

export default function AdminPublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const pathname = usePathname()
	const { data: session } = useSession()
	const { company } = useCompany()

	const adminUser = (session?.user as AdminSessionUser | undefined) ?? undefined

	const firstName = adminUser?.name ?? "Admin"
	const lastName = adminUser?.lastname ?? adminUser?.lastName ?? "User"
	const fullName = `${firstName} ${lastName}`.trim()
	const adminEmail = adminUser?.email ?? "admin@empresa.com"
	const adminImage = adminUser?.image ?? "https://i.pravatar.cc/100?img=12"

	const companyName = company?.name ?? "ATS"
	const companyLogo = company?.logo
	const currentPage = getAdminBreadcrumbLabel(pathname)

	return (
		<SidebarProvider>
			<Sidebar collapsible="offcanvas">
				<SidebarHeader>
					<div className="flex items-center gap-3 rounded-md px-2 py-1">
						<Link href="/admin/dashboard" className="flex items-center gap-3">
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
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{adminLinks.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
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
						onClick={() => void signOut({ callbackUrl: "/login" })}
					>
						<LogOut className="mr-2 size-4" />
						Logout
					</Button>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset>
				<header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
					<SidebarTrigger />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{currentPage}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</header>

				<main className="p-4 sm:p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
