import asyncio
import os
from dataclasses import dataclass
from functools import lru_cache

from google import genai
from google.genai import types

from fastapi_service.environment import load_environment

from .prompt_builder import build_company_values_prompt
from .schemas import CompanyValuesSuggestionRequest, CompanyValuesSuggestionResponse


class LlmConfigurationError(RuntimeError):
    pass


class LlmGenerationError(RuntimeError):
    pass


@dataclass(frozen=True)
class LlmSettings:
    api_key: str
    model: str


@lru_cache(maxsize=1)
def get_llm_settings() -> LlmSettings:
    load_environment()

    api_key = os.getenv("GEMINI_LLM_API_KEY", "").strip()
    model = os.getenv("GEMINI_LLM_MODEL", "").strip()

    if not api_key:
        raise LlmConfigurationError("GEMINI_LLM_API_KEY is required")

    if not model:
        raise LlmConfigurationError("GEMINI_LLM_MODEL is required")

    return LlmSettings(api_key=api_key, model=model)


class CompanyValuesSuggestionService:
    def __init__(self, client: genai.Client, model: str) -> None:
        self._client = client
        self._model = model

    async def suggest_values(
        self, payload: CompanyValuesSuggestionRequest
    ) -> CompanyValuesSuggestionResponse:
        prompt = build_company_values_prompt(payload)

        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CompanyValuesSuggestionResponse,
                ),
            )
        except Exception as error:  # pragma: no cover - network/provider errors
            raise LlmGenerationError("No se pudieron generar sugerencias de valores") from error

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, CompanyValuesSuggestionResponse):
            return CompanyValuesSuggestionResponse(values=_clean_values(parsed.values))

        raise LlmGenerationError("La respuesta del LLM no tiene el formato esperado")


def _clean_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    clean_values: list[str] = []

    for value in values:
        clean = value.strip()
        normalized = " ".join(clean.split()).casefold()

        if not clean or normalized in seen:
            continue

        seen.add(normalized)
        clean_values.append(clean)

    return clean_values


@lru_cache(maxsize=1)
def get_company_values_suggestion_service() -> CompanyValuesSuggestionService:
    settings = get_llm_settings()
    client = genai.Client(api_key=settings.api_key)
    return CompanyValuesSuggestionService(client=client, model=settings.model)
