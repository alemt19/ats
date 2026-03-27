import Link from "next/link"
import { headers } from "next/headers"

import { fetchMyNotificationsServer } from "react/lib/notifications"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Reciente"
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function resolveAdminNotificationHref(entityType: string, entityId: number) {
  if (entityType === "job") {
    return `/admin/ofertas/${entityId}`
  }

  return "/admin/ofertas"
}

export default async function AdminNotificationsPage() {
  const cookie = (await headers()).get("cookie") ?? ""
  const notifications = await fetchMyNotificationsServer(cookie)

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <p className="text-sm text-foreground/70">Alertas sobre ofertas con bajo movimiento y acciones recomendadas.</p>
      </div>

      <div className="space-y-3">
        {notifications.items.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm text-foreground/70 shadow-soft">
            No hay notificaciones por ahora.
          </div>
        ) : (
          notifications.items.map((notification) => (
            <article
              key={notification.id}
              className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">{notification.title}</h2>
                <span className="text-xs text-foreground/60">{formatDate(notification.created_at)}</span>
              </div>

              <p className="mt-2 text-sm text-foreground/75">{notification.message}</p>

              <div className="mt-3">
                <Link
                  href={resolveAdminNotificationHref(notification.entity_type, notification.entity_id)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
