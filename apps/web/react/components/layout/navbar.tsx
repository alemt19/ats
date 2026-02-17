"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "../ui/navigation-menu"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "../ui/sheet"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { ChevronDown, LogOut, Menu, User } from "lucide-react"

type NavbarProps = {
	companyName?: string
	logoSrc?: string
}

export default function Navbar({
	companyName,
	logoSrc,
}: NavbarProps) {
	const { data: session } = useSession()
	const [company, setCompany] = React.useState<
		| {
			name: string
			logo: string
		}
		| null
	>(null)

	React.useEffect(() => {
		if (companyName || logoSrc) {
			return
		}

		const controller = new AbortController()

		async function loadCompany() {
			try {
				const response = await fetch("https://dummyjson.com/products/1", {
					signal: controller.signal,
				})

				if (!response.ok) {
					return
				}

				const data = (await response.json()) as {
					brand?: string
					thumbnail?: string
				}

				if (data.brand && data.thumbnail) {
					setCompany({ name: data.brand, logo: data.thumbnail })
				}
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					setCompany(null)
				}
			}
		}

		loadCompany()

		return () => {
			controller.abort()
		}
	}, [companyName, logoSrc])

	const demoSession = React.useMemo(
		() => ({
			user: {
				name: "Carla Lopez",
				image: "https://i.pravatar.cc/100?img=32",
			},
		}),
		[]
	)

	const effectiveSession = session ?? demoSession
	const user = effectiveSession?.user
	const resolvedCompanyName = companyName ?? company?.name ?? "Ats"
	const resolvedLogoSrc = logoSrc ?? company?.logo
	const navItems = [
		{ href: "/#como-funciona", label: "Como funciona" },
		{ href: "/#beneficios", label: "Beneficios" },
		{ href: "/#ofertas", label: "Ofertas" },
	]

	return (
		<nav className="sticky top-0 z-50 border-b border-neutral-200 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
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

				<div className="flex items-center gap-2 md:gap-4">
					<NavigationMenu viewport={false} className="hidden md:flex">
						<NavigationMenuList className="gap-2">
							{navItems.map((item) => (
								<NavigationMenuItem key={item.href}>
									<NavigationMenuLink
										asChild
										className={navigationMenuTriggerStyle()}
									>
										<Link href={item.href}>{item.label}</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							))}
							<NavigationMenuItem>
								<Button asChild variant="default" className="bg-blue-700 hover:bg-blue-800">
									<Link href="/#postulate" className="text-neutral-100">
										<span>Postulate Ahora</span>
									</Link>
								</Button>
							</NavigationMenuItem>

						</NavigationMenuList>
					</NavigationMenu>

					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
								<Menu className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="md:hidden">
							<SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
							<div className="mt-8 flex flex-col gap-2 px-4">
								{navItems.map((item) => (
									<SheetClose asChild key={item.href}>
										<Link
											href={item.href}
											className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
										>
											{item.label}
										</Link>
									</SheetClose>
								))}
								<SheetClose asChild>
									<Button asChild className="mt-2 w-full bg-blue-700 hover:bg-blue-800">
										<Link href="/#postulate">Postulate Ahora</Link>
									</Button>
								</SheetClose>
							</div>
						</SheetContent>
					</Sheet>

					{user && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild className="cursor-pointer">
								<Button variant="ghost" className="h-9 rounded-full px-2">
									<Avatar className="h-8 w-8">
										<AvatarImage src={user.image ?? undefined} alt={user.name ?? "Usuario"} />
										<AvatarFallback>
											{(user.name ?? "U").slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="max-w-24 truncate text-sm font-medium">{user.name ?? "Usuario"}</span>
									<ChevronDown className="size-4 text-muted-foreground" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56" align="end" forceMount>
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">{user.name}</p>
										<p className="text-xs leading-none text-muted-foreground">
											{user.name || "usuario@ejemplo.com"}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link href="/perfil" className="cursor-pointer">
										<User className="mr-2 size-4" />
										<span>Mi perfil</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="cursor-pointer text-red-600 focus:text-red-600"
									onClick={() => console.log("Cerrar sesión")}
								>
									<LogOut className="mr-2 size-4" />
									<span>Salir</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

		</nav>
	)
}

function ListItem({
	title,
	children,
	href,
	...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
	return (
		<li {...props}>
			<NavigationMenuLink asChild>
				<Link href={href}>
					<div className="flex flex-col gap-1 text-sm">
						<div className="leading-none font-medium">{title}</div>
						<div className="text-muted-foreground line-clamp-2">{children}</div>
					</div>
				</Link>
			</NavigationMenuLink>
		</li>
	)
}
