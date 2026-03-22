export type AnalyticsEventPayload = Record<string, unknown>

export function trackUxEvent(event: string, payload: AnalyticsEventPayload = {}) {
  if (typeof window === "undefined") {
    return
  }

  const body = {
    event,
    payload,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  }

  window.dispatchEvent(new CustomEvent("ats:ux-event", { detail: body }))

  try {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" })
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/analytics/events", blob)
      return
    }
  } catch {
    // Fallback to fetch below.
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Swallow analytics transport errors.
  })
}
