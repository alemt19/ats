"use client"

import Link from "next/link"
import * as React from "react"
import { Bell, BellDot } from "lucide-react"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "react/components/ui/dropdown-menu"
import type { UserNotification } from "react/lib/notifications"

type NotificationsPanelProps = {
	notifications: UserNotification[]
	unreadCount?: number
	scope: "candidate" | "admin"
}

function formatRelativeDate(isoDate: string) {
	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) {
		return "Reciente"
	}

	const diffMs = Date.now() - date.getTime()
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (days <= 0) {
		return "Hoy"
	}

	if (days === 1) {
		return "Hace 1 día"
	}

	if (days < 30) {
		return `Hace ${days} días`
	}

	return date.toLocaleDateString("es-ES")
}

function getNotificationTarget(scope: "candidate" | "admin", notification: UserNotification) {
	if (scope === "candidate") {
		if (notification.entity_type === "application") {
			return "/mi-perfil/postulaciones"
		}

		return "/mi-perfil"
	}

	if (notification.entity_type === "job") {
		return `/admin/ofertas/${notification.entity_id}`
	}

	return "/admin/ofertas"
}

function getAllNotificationsTarget(scope: "candidate" | "admin") {
	return scope === "candidate" ? "/mi-perfil/notificaciones" : "/admin/notificaciones"
}

export default function NotificationsPanel({
	notifications,
	unreadCount = 0,
	scope,
}: NotificationsPanelProps) {
	const [items, setItems] = React.useState<UserNotification[]>(notifications)
	const [unread, setUnread] = React.useState(unreadCount)
	const [markingId, setMarkingId] = React.useState<number | null>(null)

	React.useEffect(() => {
		setItems(notifications)
	}, [notifications])

	React.useEffect(() => {
		setUnread(unreadCount)
	}, [unreadCount])

	const hasItems = items.length > 0

	const handleMarkAsRead = React.useCallback(
		async (id: number) => {
			const target = items.find((item) => item.id === id)
			if (!target || target.read_at) {
				return
			}

			setMarkingId(id)

			try {
				const response = await fetch(`/api/notifications/${id}/read`, {
					method: "PATCH",
					cache: "no-store",
				})

				if (!response.ok) {
					return
				}

				setItems((prev) =>
					prev.map((item) =>
						item.id === id ? { ...item, read_at: new Date().toISOString() } : item
					)
				)
				setUnread((prev) => Math.max(0, prev - 1))
			} finally {
				setMarkingId(null)
			}
		},
		[items]
	)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="relative h-9 w-9 rounded-xl border-border/70 bg-background/80"
					aria-label="Abrir notificaciones"
				>
					<Bell className="size-4" />
					{unread > 0 ? (
						<span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-semibold text-white">
							{Math.min(unread, 9)}{unread > 9 ? "+" : ""}
						</span>
					) : null}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-[min(92vw,24rem)] p-0">
				<div className="flex items-center justify-between px-3 py-2">
					<DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
					{unread > 0 ? (
						<Badge className="rounded-full bg-amber-500 text-white">{unread} sin leer</Badge>
					) : null}
				</div>
				<DropdownMenuSeparator />

				<div className="max-h-80 space-y-2 overflow-y-auto p-2">
					{hasItems ? (
						items.slice(0, 8).map((notification) => (
							<div
								key={notification.id}
								className="rounded-lg border border-border/60 bg-background px-3 py-2"
							>
								<div className="flex items-start justify-between gap-2">
									<p className="text-sm font-medium text-foreground">{notification.title}</p>
									<span className="shrink-0 text-xs text-foreground/60">{formatRelativeDate(notification.created_at)}</span>
								</div>
								<p className="mt-1 line-clamp-2 text-xs text-foreground/75">{notification.message}</p>
								<div className="mt-2 flex items-center justify-between">
									<Link
										href={getNotificationTarget(scope, notification)}
										className="text-xs font-medium text-primary hover:underline"
									>
										Ver detalle
									</Link>
									{notification.read_at ? (
										<span className="text-[11px] text-foreground/60">Leida</span>
									) : (
										<button
											type="button"
											onClick={() => void handleMarkAsRead(notification.id)}
											disabled={markingId === notification.id}
											className="text-[11px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
										>
											{markingId === notification.id ? "Guardando..." : "Marcar como leida"}
										</button>
									)}
								</div>
							</div>
						))
					) : (
						<div className="rounded-lg border border-border/60 bg-background px-3 py-3 text-sm text-foreground/75">
							<div className="mb-1 flex items-center gap-2 text-foreground/80">
								<BellDot className="size-4" />
								<span className="font-medium">Todo al día</span>
							</div>
							No hay notificaciones por ahora.
						</div>
					)}
				</div>

				<DropdownMenuSeparator />
				<div className="p-2">
					<Link
						href={getAllNotificationsTarget(scope)}
						className="block rounded-md px-2 py-1.5 text-center text-sm font-medium text-primary hover:bg-muted/50"
					>
						Ver todas
					</Link>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
