import { getSession } from "../../../auth"
import { headers } from "next/headers"
import CompetenciasValoresForm, {
    type CompetenciasValoresInitialData,
} from "./competencias-valores-form"

type CompetenciasValoresPageResponse = {
    initialData: CompetenciasValoresInitialData
    technicalSkillOptions: string[]
    softSkillOptions: string[]
    valueOptions: string[]
}

async function fetchProfileDataServer(
    cookie: string
): Promise<CompetenciasValoresPageResponse> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/api/candidates/me/competencias-valores`, {
            method: "GET",
            headers: {
                cookie,
            },
            cache: "no-store",
        })

        if (response.ok) {
            const payload = (await response.json()) as {
                data?: CompetenciasValoresPageResponse
            }

            if (payload.data) {
                return payload.data
            }
        }
    } catch {
        // Return empty defaults if backend is unavailable.
    }

    return {
        initialData: {
            cv_url: "",
            behavioral_ans_1: "",
            behavioral_ans_2: "",
            technical_skills: [],
            soft_skills: [],
            values: [],
        },
        technicalSkillOptions: [],
        softSkillOptions: [],
        valueOptions: [],
    }
}

export default async function CompetenciasValoresPage() {
    const session = await getSession()
    const userId = session?.user?.id ?? ""
    const cookie = (await headers()).get("cookie") ?? ""
    const behavioralQuestion1 =
        process.env.behavioral_question_1 ??
        "Cuéntame sobre una ocasión en la que tuviste que lidiar con un conflicto en un equipo. ¿Cuál fue la situación, cómo la manejaste y cuál fue el resultado?"
    const behavioralQuestion2 =
        process.env.behavioral_question_2 ??
        "Describe una situación en la que fallaste o cometiste un error importante. ¿Cómo reaccionaste y qué aprendiste de esa experiencia?"

    const profileData = await fetchProfileDataServer(cookie)

    return (
        <CompetenciasValoresForm
            userId={userId}
            initialData={profileData.initialData}
            technicalSkillOptions={profileData.technicalSkillOptions}
            softSkillOptions={profileData.softSkillOptions}
            valueOptions={profileData.valueOptions}
            behavioralQuestion1={behavioralQuestion1}
            behavioralQuestion2={behavioralQuestion2}
        />
    )
}