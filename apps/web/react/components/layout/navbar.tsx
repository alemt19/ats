"use client"

import Link from "next/link"
import * as React from "react"
import { useTheme } from "next-themes"
import { signOut } from "../../../auth-client"
import { useCandidateSession } from "react/hooks/use-segmented-session"

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
import { ChevronDown, LogOut, Menu, Moon, Sun, User } from "lucide-react"
import NotificationsPanel from "./notifications-panel"
import type { UserNotification } from "react/lib/notifications"

type NavbarProps = {
  companyName?: string
  logoSrc?: string
}

export default function Navbar({ companyName, logoSrc }: NavbarProps) {
  const { user, isPending, isAuthenticated } = useCandidateSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [notifications, setNotifications] = React.useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated) return
    void fetch("/api/notifications/me", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items?: UserNotification[]; unreadCount?: number } | null) => {
        if (!data) return
        setNotifications(data.items ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      })
  }, [isAuthenticated])

  const isAuthResolved = !isPending
  const resolvedCompanyName = companyName ?? "Ats"
  const resolvedLogoSrc = logoSrc
  const isDark = mounted && theme === "dark"
  const navItems = [
    { href: "/#como-funciona", label: "Como funciona" },
    { href: "/#beneficios", label: "Beneficios" },
    { href: "/#ofertas", label: "Ofertas" },
    { href: "/nosotros", label: "Nosotros" },
  ]

  return (
    <nav aria-label="Navegacion principal" className="sticky top-0 z-50 border-b border-border/80 bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          {resolvedLogoSrc ? (
            <img
              src={resolvedLogoSrc}
              alt={`${resolvedCompanyName} logo`}
              width={34}
              height={34}
              className="h-8 w-8 rounded-lg border border-border/70 object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-soft transition-transform duration-[240ms] group-hover:scale-105">
              {resolvedCompanyName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
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
                    className={`${navigationMenuTriggerStyle()} rounded-full bg-transparent px-4 text-muted-foreground transition-colors duration-[240ms] hover:bg-muted/85 hover:text-foreground`}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem>
                <Button asChild className="rounded-full px-5 shadow-elevated transition-transform duration-[240ms] hover:-translate-y-0.5 focus-visible:-translate-y-0.5">
                  <Link href="/ofertas">
                    <span>Postúlate ahora</span>
                  </Link>
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border/70 bg-card/95 md:hidden">
              <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
              <div className="mt-8 flex flex-col gap-2 px-4">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-[240ms] hover:bg-muted/90 hover:text-foreground">
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button asChild className="mt-2 w-full rounded-full shadow-elevated">
                    <Link href="/ofertas">Postulate ahora</Link>
                  </Button>
                </SheetClose>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 w-full rounded-full hover:border-primary/45 hover:bg-muted/90"
                  aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                  onClick={() => {
                    setTheme(isDark ? "light" : "dark")
                  }}
                >
                  {isDark ? (
                    <>
                      <Sun aria-hidden="true" className="size-4" />
                      <span>Tema claro</span>
                    </>
                  ) : (
                    <>
                      <Moon aria-hidden="true" className="size-4" />
                      <span>Tema oscuro</span>
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden rounded-full hover:border-primary/45 hover:bg-muted/90 md:inline-flex"
            aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            onClick={() => {
              setTheme(isDark ? "light" : "dark")
            }}
          >
            {isDark ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </Button>

          {isAuthenticated && (
            <NotificationsPanel
              notifications={notifications}
              unreadCount={unreadCount}
              scope="candidate"
            />
          )}

          {!isAuthResolved ? (
            <div className="h-9 w-33 animate-pulse rounded-full bg-muted" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Button variant="ghost" className="h-9 rounded-full px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? undefined} />
                    <AvatarFallback>
                      {(user.name ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-24 truncate text-sm font-medium">{user.name ?? "Usuario"}</span>
                  <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name ?? "Usuario"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || "usuario@ejemplo.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mi-perfil" className="cursor-pointer">
                    <User aria-hidden="true" className="mr-2 size-4" />
                    <span>Mi perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => {
                    void (async () => {
                      document.cookie = "ats_scope=; Path=/; Max-Age=0; SameSite=Lax"
                      await signOut()
                      window.location.href = "/login"
                    })()
                  }}
                >
                  <LogOut aria-hidden="true" className="mr-2 size-4" />
                  <span>Salir</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="rounded-full px-5">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}

