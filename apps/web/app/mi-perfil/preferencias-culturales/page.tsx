import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"

import { getSession } from "../../../auth"
import PreferenciasCulturalesForm, {
    type CulturePreferenceCategory,
} from "./preferencias-culturales-form"

type UserPreferencesResponse = Partial<Record<string, string | null>>

async function readJsonFile<T>(relativePath: string): Promise<T> {
    const fullPath = path.join(process.cwd(), "public", "data", relativePath)
    const fileContents = await readFile(fullPath, "utf-8")
    return JSON.parse(fileContents) as T
}

async function fetchCulturePreferencesServer(
    cookie: string
): Promise<UserPreferencesResponse> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/api/candidates/me`, {
            method: "GET",
            headers: {
                cookie,
            },
            cache: "no-store",
        })

        if (response.ok) {
            const payload = (await response.json()) as {
                success?: boolean
                data?: UserPreferencesResponse
            }

            return payload.data ?? {}
        }
    } catch {
        // Return empty selections if backend is unavailable.
    }

    return {}
}

export default async function PreferenciasCulturalesPage() {
    const session = await getSession()
    const requestHeaders = await headers()
    const cookie = requestHeaders.get("cookie") ?? ""

    const [categories, initialSelections] = await Promise.all([
        readJsonFile<CulturePreferenceCategory[]>("culture_preference_candidate.json"),
        fetchCulturePreferencesServer(cookie),
    ])

    return (
        <PreferenciasCulturalesForm
            categories={categories}
            initialSelections={initialSelections}
        />
    )
}