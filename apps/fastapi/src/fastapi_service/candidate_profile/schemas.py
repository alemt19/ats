from pydantic import BaseModel, Field


class CandidateProfileSuggestionResponse(BaseModel):
    technical_skills: list[str] = Field(
        default_factory=list,
        description=(
            "Habilidades tecnicas del candidato aplicables a su profesion (procedimientos, "
            "tecnicas de trabajo, herramientas, equipos, normativas o metodos especificos del rol)."
            " Ejemplo: ['analisis financiero', 'soldadura mig', 'contabilidad tributaria', "
            "'gestion de inventarios', 'diagnostico clinico']."
        ),
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description=(
            "Habilidades blandas del candidato. Ejemplo: ['comunicacion', 'trabajo en equipo', "
            "'liderazgo', 'resolucion de conflictos']."
        ),
    )
    values: list[str] = Field(
        default_factory=list,
        description=(
            "Valores personales/profesionales del candidato. Ejemplo: ['responsabilidad', "
            "'integridad', 'honestidad', 'compromiso']."
        ),
    )
