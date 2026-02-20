import path from "node:path"
import { readFile } from "node:fs/promises"

import { auth } from "../../../auth"
import PreferenciasCulturalesForm, {
    type CulturePreferenceCategory,
} from "./preferencias-culturales-form"

type UserPreferencesResponse = Record<string, string>

function isPreferencesEnvelope(
    value: unknown
): value is { preferences?: Record<string, string> } {
    return typeof value === "object" && value !== null && "preferences" in value
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
    const fullPath = path.join(process.cwd(), "public", "data", relativePath)
    const fileContents = await readFile(fullPath, "utf-8")
    return JSON.parse(fileContents) as T
}

async function fetchCulturePreferencesServer(
    userId: string,
    accessToken?: string
): Promise<UserPreferencesResponse> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/profile/culture-preferences`, {
            method: "GET",
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                "x-user-id": userId,
            },
            cache: "no-store",
        })

        if (response.ok) {
            const payload = (await response.json()) as unknown

            if (isPreferencesEnvelope(payload)) {
                return payload.preferences ?? {}
            }

            return (payload ?? {}) as UserPreferencesResponse
        }
    } catch {
        // Fallback to mock data while backend endpoint is not implemented.
    }
    // delay de 500ms to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
        // dress_code: "semi_formal",
        // collaboration_style: "mixed",
        // work_pace: "moderate",
        // level_of_autonomy: "balanced",
        // dealing_with_management: "friendly_and_approachable",
        // level_of_monitoring: "weekly_goals",
    }
}

export default async function PreferenciasCulturalesPage() {
    const session = await auth()
    const userId = session?.user?.id ?? "user_123"
    const accessToken = session?.accessToken

    const [categories, initialSelections] = await Promise.all([
        readJsonFile<CulturePreferenceCategory[]>("culture_preference.json"),
        fetchCulturePreferencesServer(userId, accessToken),
    ])

    return (
        <PreferenciasCulturalesForm
            userId={userId}
            categories={categories}
            initialSelections={initialSelections}
        />
    )
}