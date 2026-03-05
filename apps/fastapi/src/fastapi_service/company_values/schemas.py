from pydantic import BaseModel, Field


class CompanyValuesSuggestionRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    mision: str = Field(min_length=1)


class CompanyValuesSuggestionResponse(BaseModel):
    values: list[str] = Field(default_factory=list)
