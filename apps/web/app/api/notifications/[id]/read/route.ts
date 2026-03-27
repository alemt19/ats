import { NextResponse } from "next/server"

const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const notificationId = Number(id)

  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return NextResponse.json({ message: "ID de notificación inválido" }, { status: 400 })
  }

  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(`${backendApiUrl}/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "No se pudo actualizar la notificación")
        : "No se pudo actualizar la notificación"

    return NextResponse.json({ message }, { status: response.status >= 400 ? response.status : 500 })
  }

  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : payload

  return NextResponse.json(data ?? { success: true })
}
