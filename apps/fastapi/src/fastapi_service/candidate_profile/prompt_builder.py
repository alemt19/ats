from .schemas import CandidateProfileSuggestionResponse


def build_candidate_profile_prompt(
    *,
    behavioral_question_1: str,
    behavioral_question_2: str,
    behavioral_ans_1: str,
    behavioral_ans_2: str,
    cv_text: str,
) -> str:
    schema_example = CandidateProfileSuggestionResponse.model_json_schema()

    return f"""
Eres un asistente experto en reclutamiento y analisis de perfil profesional.
Debes inferir habilidades y valores SOLO a partir de la evidencia del CV
y de las respuestas conductuales.

Reglas obligatorias:
1) No inventes informacion. Si no hay evidencia suficiente,
   devuelve listas vacias o elementos minimos evidentes.
2) Conserva mayusculas, minusculas y tildes de forma natural en espanol.
3) Devuelve cada elemento con formato legible de etiqueta, por ejemplo: "Comunicación", "Trabajo en equipo", "Python", "Resolución de problemas".
4) No repitas elementos dentro de la misma lista.
5) Cada elemento debe ser breve, concreto y utilizable como tag (1 a 4 palabras).
6) Responde estrictamente en JSON con esta forma:
{schema_example}
7) Respeta estas categorias sin mezclarlas:
        - technical_skills: habilidades tecnicas especificas del oficio/profesion
            (tecnicas, procedimientos, herramientas, equipos, normas o metodos del area).
    - soft_skills: habilidades blandas y conductuales.
    - values: valores personales o profesionales.

Contexto:
- Pregunta conductual 1: {behavioral_question_1}
- Respuesta 1: {behavioral_ans_1}
- Pregunta conductual 2: {behavioral_question_2}
- Respuesta 2: {behavioral_ans_2}

Texto del CV:
{cv_text}
""".strip()
