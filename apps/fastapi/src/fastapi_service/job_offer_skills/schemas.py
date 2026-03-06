from pydantic import BaseModel, Field


class JobOfferSkillsSuggestionRequest(BaseModel):
    title: str = Field(min_length=1, description="Titulo de la oferta laboral")
    puesto: str = Field(min_length=1, description="Puesto de la oferta laboral")
    description: str = Field(min_length=1, description="Descripcion de la oferta laboral")


class JobOfferSkillsSuggestionResponse(BaseModel):
    technical_skills: list[str] = Field(
        default_factory=list,
        description=(
            "Aqui colocarias las habilidades tecnicas requeridas, ejemplo ['HTML', 'Contaduria', "
            "'excel', 'sap'], coloca las que indique explicitamente la oferta laboral y las que "
            "infieras del contexto si se proporciona la suficiente informacion sino no te pongas a inventar"
        ),
    )
    soft_skills: list[str] = Field(
        default_factory=list,
        description=(
            "Aqui colocarias las habilidades blandas requeridas, ejemplo ['Comunicacion', 'Trabajo "
            "en equipo', ...], coloca las que indique explicitamente la oferta laboral y las que "
            "infieras del contexto si se proporciona la suficiente informacion sino no te pongas a inventar"
        ),
    )
