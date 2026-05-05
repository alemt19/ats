import type { CompetenciasValoresInitialData } from "./competencias-valores/competencias-valores-form"

export type CompetenciasValoresPageResponse = {
  initialData: CompetenciasValoresInitialData
  technicalSkillOptions: string[]
  softSkillOptions: string[]
  valueOptions: string[]
  credentialOptions: string[]
}

export const emptyCompetenciasValoresProfileData: CompetenciasValoresPageResponse = {
  initialData: {
    cv_url: "",
    behavioral_ans_1: "",
    behavioral_ans_2: "",
    technical_skills: [],
    soft_skills: [],
    values: [],
    credentials: [],
    experiences: [],
  },
  technicalSkillOptions: [],
  softSkillOptions: [],
  valueOptions: [],
  credentialOptions: [],
}

export async function fetchProfileDataServer(cookie: string): Promise<CompetenciasValoresPageResponse> {
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

  return emptyCompetenciasValoresProfileData
}
