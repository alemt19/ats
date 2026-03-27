export type UserNotification = {
	id: number
	type: string
	entity_type: string
	entity_id: number
	title: string
	message: string
	created_at: string
	read_at: string | null
}

export type UserNotificationsPayload = {
	unreadCount: number
	items: UserNotification[]
}

export async function fetchMyNotificationsServer(cookie: string): Promise<UserNotificationsPayload> {
	if (!cookie) {
		return {
			unreadCount: 0,
			items: [],
		}
	}

	const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
	const endpoints = [
		`${apiBaseUrl}/api/notifications/me`,
		`${apiBaseUrl}/notifications/me`,
	]

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				method: "GET",
				headers: {
					cookie,
				},
				cache: "no-store",
			})

			if (!response.ok) {
				continue
			}

			const payload = (await response.json().catch(() => null)) as
				| UserNotificationsPayload
				| { data?: UserNotificationsPayload }
				| null

			if (payload && typeof payload === "object" && "data" in payload && payload.data) {
				return payload.data
			}

			if (
				payload &&
				typeof payload === "object" &&
				"items" in payload &&
				Array.isArray(payload.items)
			) {
				return {
					unreadCount: Number((payload as UserNotificationsPayload).unreadCount ?? 0),
					items: payload.items,
				}
			}
		} catch {
			// Continue with fallback endpoint.
		}
	}

	return {
		unreadCount: 0,
		items: [],
	}
}
