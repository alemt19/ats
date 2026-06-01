import json
from typing import Any


def _pretty_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def _filter_culture_catalog(
    catalog: list[dict[str, Any]],
    candidate_preferences: dict[str, str | None],
    company_preferences: dict[str, str | None],
) -> list[dict[str, Any]]:
    """
    Return only the catalog entries and value descriptions that are relevant
    to what the candidate and company actually have set. Drops categories where
    both sides are null or indifferent, and drops option descriptions that are
    not chosen by either party — reducing prompt size significantly.

    The returned structure is human-readable only: it uses display_name fields
    and omits technical_name so the prompt can talk about cultural preferences
    without exposing internal keys.
    """
    relevant: list[dict[str, Any]] = []

    for category in catalog:
        catalog_key: str = category["technical_name"]
        cand_val = candidate_preferences.get(catalog_key)
        comp_val = company_preferences.get(catalog_key)

        # Skip if no data on either side
        if cand_val is None and comp_val is None:
            continue

        # Keep only the value descriptions that matter: the candidate's and the company's choice
        relevant_values = set(filter(None, [cand_val, comp_val, "indifferent"]))
        filtered_values = [
            v for v in category.get("values", [])
            if v.get("technical_name") in relevant_values
        ]

        if filtered_values:
            value_display_names = {
                str(value.get("technical_name")): str(value.get("display_name", "")).strip()
                for value in category.get("values", [])
            }

            relevant.append({
                "display_name": category["display_name"],
                "description": category.get("description", ""),
                "candidate_value": value_display_names.get(cand_val, cand_val),
                "company_value": value_display_names.get(comp_val, comp_val),
                "value_descriptions": [
                    {
                        "display_name": value.get("display_name", ""),
                        "description": value.get("description", ""),
                    }
                    for value in filtered_values
                ],
            })

    return relevant


def _truncate(text: str | None, max_chars: int) -> str:
    """Truncate text to max_chars, appending ellipsis if cut."""
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "…"


def build_application_feedback_prompt(
    *,
    scores: dict[str, float],
    candidate_context: dict[str, Any],
    company_context: dict[str, Any],
    job_context: dict[str, Any],
    culture_preference_catalog: list[dict[str, Any]],
) -> str:
    # Extract preference dicts for catalog filtering
    candidate_prefs: dict[str, str | None] = candidate_context.get("preferencias_culturales", {})
    company_prefs: dict[str, str | None] = company_context.get("preferencias_culturales", {})

    filtered_catalog = _filter_culture_catalog(
        culture_preference_catalog, candidate_prefs, company_prefs
    )

    # Truncate heavy text fields to reduce token usage without losing signal
    candidate_context_trimmed = {
        **candidate_context,
        "cv_text": _truncate(candidate_context.get("cv_text"), 1200),
    }
    job_context_trimmed = {
        **job_context,
        "description": _truncate(job_context.get("description"), 400),
    }

    return f"""
Eres un analista senior de reclutamiento y seleccion.

Debes redactar feedback para una postulacion laboral a partir de puntajes objetivos y del
contexto del candidato, la empresa y la vacante.

El feedback sera leido tanto por reclutadores como por la persona candidata.
Usa un tono profesional, claro y constructivo, evitando lenguaje excluyente o demasiado tecnico.
Escribe recomendaciones accionables y observaciones equilibradas que sean utiles para ambos.

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
- Evita juicios personales absolutos. Prioriza evidencia observable del contexto provisto.
- Si incluyes alertas, acompanalas de una accion concreta de mejora o validacion.
- Cuando menciones preferencias culturales, usa solo nombres legibles como los
    display_name. No muestres technical_name ni claves internas.

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
{_pretty_json(candidate_context_trimmed)}

Contexto de la empresa:
{_pretty_json(company_context)}

Contexto de la vacante:
{_pretty_json(job_context_trimmed)}

Preferencias culturales relevantes (usa nombres legibles, no tecnicos):
{_pretty_json(filtered_catalog)}
""".strip()
