import json
from typing import Any


def _pretty_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def build_application_feedback_prompt(
    *,
    scores: dict[str, float],
    candidate_context: dict[str, Any],
    company_context: dict[str, Any],
    job_context: dict[str, Any],
    culture_preference_catalog: list[dict[str, Any]],
) -> str:
    return f"""
Eres un analista senior de reclutamiento y seleccion.

Debes redactar feedback para una postulacion laboral a partir de puntajes objetivos y del
contexto del candidato, la empresa y la vacante.

Responde SOLO con JSON valido.

Reglas estrictas de salida:
- El JSON debe ser un objeto plano.
- Cada propiedad debe estar en espanol.
- Cada propiedad debe ser un titulo breve y claro, apto para usarse como heading HTML.
- Cada valor debe ser un unico parrafo en espanol, sin listas, sin markdown y sin HTML.
- Genera entre 4 y 6 propiedades.
- No inventes informacion que no este en el contexto.
- Si falta informacion relevante, dilo de forma explicita dentro del parrafo correspondiente.
- Usa los puntajes para justificar fortalezas, alertas y encaje general.
- No incluyas claves tecnicas como score, json, html, candidato, empresa o vacante como
  unico titulo generico. Los titulos deben ser utiles para el lector final.

Ejemplo del formato esperado:
{{
  "Encaje General": "Parrafo en espanol.",
  "Fortaleza Tecnica": "Parrafo en espanol.",
  "Ajuste Cultural": "Parrafo en espanol.",
  "Riesgos a Validar": "Parrafo en espanol."
}}

Puntajes de la postulacion:
{_pretty_json(scores)}

Contexto del candidato:
{_pretty_json(candidate_context)}

Contexto de la empresa:
{_pretty_json(company_context)}

Contexto de la vacante:
{_pretty_json(job_context)}

Catalogo de significados para preferencias culturales del candidato:
{_pretty_json(culture_preference_catalog)}
""".strip()