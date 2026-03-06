import asyncio
import os
import unicodedata
from dataclasses import dataclass
from functools import lru_cache

from google import genai
from google.genai import types

from fastapi_service.environment import load_environment

from .prompt_builder import build_job_offer_skills_prompt
from .schemas import JobOfferSkillsSuggestionRequest, JobOfferSkillsSuggestionResponse


class SuggestionConfigurationError(RuntimeError):
    pass


class SuggestionGenerationError(RuntimeError):
    pass


@dataclass(frozen=True)
class SuggestionSettings:
    api_key: str
    model: str


@lru_cache(maxsize=1)
def get_suggestion_settings() -> SuggestionSettings:
    load_environment()

    api_key = os.getenv("GEMINI_LLM_API_KEY", "").strip()
    model = os.getenv("GEMINI_LLM_MODEL", "").strip()

    if not api_key:
        raise SuggestionConfigurationError("GEMINI_LLM_API_KEY is required")
    if not model:
        raise SuggestionConfigurationError("GEMINI_LLM_MODEL is required")

    return SuggestionSettings(api_key=api_key, model=model)


class JobOfferSkillsSuggestionService:
    def __init__(self, *, client: genai.Client, model: str) -> None:
        self._client = client
        self._model = model

    def _normalize_terms(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned_values: list[str] = []

        for value in values:
            preserved_enye = value.replace("ñ", "__enie_min__").replace("Ñ", "__enie_may__")
            normalized = unicodedata.normalize("NFD", preserved_enye)
            without_accents = "".join(
                char for char in normalized if unicodedata.category(char) != "Mn"
            )
            restored_enye = (
                without_accents.replace("__enie_min__", "ñ").replace("__enie_may__", "Ñ")
            )
            cleaned = restored_enye.strip().lower()

            if not cleaned or cleaned in seen:
                continue

            seen.add(cleaned)
            cleaned_values.append(cleaned)

        return cleaned_values

    async def suggest(
        self,
        payload: JobOfferSkillsSuggestionRequest,
    ) -> JobOfferSkillsSuggestionResponse:
        prompt = build_job_offer_skills_prompt(
            title=payload.title,
            puesto_en_ingles=payload.puesto,
            description=payload.description,
        )

        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=JobOfferSkillsSuggestionResponse,
                ),
            )
        except Exception as error:  # pragma: no cover - provider/network
            raise SuggestionGenerationError("No se pudieron generar sugerencias") from error

        parsed = getattr(response, "parsed", None)
        if not isinstance(parsed, JobOfferSkillsSuggestionResponse):
            raise SuggestionGenerationError("La respuesta del LLM no tiene el formato esperado")

        return JobOfferSkillsSuggestionResponse(
            technical_skills=self._normalize_terms(parsed.technical_skills),
            soft_skills=self._normalize_terms(parsed.soft_skills),
        )


@lru_cache(maxsize=1)
def get_job_offer_skills_suggestion_service() -> JobOfferSkillsSuggestionService:
    settings = get_suggestion_settings()
    client = genai.Client(api_key=settings.api_key)
    return JobOfferSkillsSuggestionService(client=client, model=settings.model)
