import { auth } from "../../../auth"
import CompetenciasValoresForm, {
    type CompetenciasValoresInitialData,
} from "./competencias-valores-form"

type CatalogResponse = {
    technical_skills: string[]
    soft_skills: string[]
    values: string[]
}

async function fetchProfileDataServer(
    userId: string,
    accessToken?: string
): Promise<CompetenciasValoresInitialData> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/profile/competencias-valores`, {
            method: "GET",
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                "x-user-id": userId,
            },
            cache: "no-store",
        })

        if (response.ok) {
            return (await response.json()) as CompetenciasValoresInitialData
        }
    } catch {
        // Fallback to mock data while backend endpoint is not implemented.
    }
    // delay de 3 segundos
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return {
        cv_url: "https://herramientas.datos.gov.co/sites/default/files/2021-08/Pruebas_3.pdf",
        behavioral_ans_1:
            "En mi último proyecto coordiné al equipo durante una migración crítica sin afectar el servicio.",
        behavioral_ans_2: "Me enfoco en comunicación clara y resolución rápida de bloqueos.",
        technical_skills: ["TypeScript", "NestJS", "PostgreSQL"],
        soft_skills: ["Comunicación", "Trabajo en equipo"],
        values: ["Responsabilidad", "Integridad"],
    }
}

async function fetchCatalogsServer(accessToken?: string): Promise<CatalogResponse> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/catalogs/skills-values`, {
            method: "GET",
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            cache: "no-store",
        })

        if (response.ok) {
            return (await response.json()) as CatalogResponse
        }
    } catch {
        // Fallback to mock data while backend endpoint is not implemented.
    }

    return {
        technical_skills: [
            "TypeScript",
            "JavaScript",
            "React",
            "Next.js",
            "Node.js",
            "NestJS",
            "PostgreSQL",
            "Docker",
            "Git",
            "Pruebas unitarias",
        ],
        soft_skills: [
            "Comunicación",
            "Trabajo en equipo",
            "Liderazgo",
            "Pensamiento crítico",
            "Resolución de problemas",
            "Adaptabilidad",
            "Gestión del tiempo",
        ],
        values: [
            "Responsabilidad",
            "Integridad",
            "Colaboración",
            "Innovación",
            "Empatía",
            "Compromiso",
            "Transparencia",
        ],
    }
}

export default async function CompetenciasValoresPage() {
    const session = await auth()
    const userId = session?.user?.id ?? "user_123"
    const accessToken = session?.accessToken
    const behavioralQuestion1 =
        process.env.behavioral_question_1 ??
        "Cuéntame sobre una ocasión en la que tuviste que lidiar con un conflicto en un equipo. ¿Cuál fue la situación, cómo la manejaste y cuál fue el resultado?"
    const behavioralQuestion2 =
        process.env.behavioral_question_2 ??
        "Describe una situación en la que fallaste o cometiste un error importante. ¿Cómo reaccionaste y qué aprendiste de esa experiencia?"

    const [initialData, catalogs] = await Promise.all([
        fetchProfileDataServer(userId, accessToken),
        fetchCatalogsServer(accessToken),
    ])

    return (
        <CompetenciasValoresForm
            userId={userId}
            initialData={initialData}
            technicalSkillOptions={catalogs.technical_skills}
            softSkillOptions={catalogs.soft_skills}
            valueOptions={catalogs.values}
            behavioralQuestion1={behavioralQuestion1}
            behavioralQuestion2={behavioralQuestion2}
        />
    )
}