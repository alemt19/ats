from .schemas import JobOfferSkillsSuggestionResponse


def build_job_offer_skills_prompt(*, title: str, puesto_en_ingles: str, description: str) -> str:
    schema_example = JobOfferSkillsSuggestionResponse.model_json_schema()

    return f"""
Eres un asistente experto en recursos humanos. Analiza la siguiente oferta laboral y extrae los siguientes datos en formato JSON.
Titulo: {title}
Puesto; {puesto_en_ingles}
La descripcion de la oferta laboral es: {description}

Reglas obligatorias:
1) Responde estrictamente en JSON con este esquema:
{schema_example}
2) technical_skills debe contener strings con habilidades tecnicas requeridas.
3) soft_skills debe contener strings con habilidades blandas requeridas.
4) Coloca las habilidades que indique explicitamente la oferta y las que se puedan inferir con suficiente contexto.
5) Si no hay suficiente contexto, no inventes habilidades.
6) Coloca todo en minusculas y sin tildes, conserva la ñ.
7) No repitas elementos dentro de cada lista.
""".strip()
