from .schemas import CompanyValuesSuggestionRequest


def build_company_values_prompt(payload: CompanyValuesSuggestionRequest) -> str:
    return (
        "Eres un asistente experto en recursos humanos. Analiza el siguiente contexto de una "
        "empresa y saca los valores corporativos de la empresa o que serían ideales en sus "
        "trabajadores para alinearse a su cultura corporativa, ojo sácalos según el contexto "
        f"proporcionado y no inventes nada. Nombre: {payload.name}\n"
        f"Descripcion: {payload.description}\n"
        f"mision: {payload.mision}\n"
    )
