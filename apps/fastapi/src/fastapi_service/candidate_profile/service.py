import asyncio
import io
import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import psycopg
from google import genai
from google.genai import types
from pypdf import PdfReader

from fastapi_service.environment import load_environment

from .prompt_builder import build_candidate_profile_prompt
from .schemas import CandidateProfileSuggestionResponse


class SuggestionConfigurationError(RuntimeError):
    pass


class SuggestionGenerationError(RuntimeError):
    pass


@dataclass(frozen=True)
class SuggestionSettings:
    api_key: str
    model: str
    database_url: str


@lru_cache(maxsize=1)
def get_suggestion_settings() -> SuggestionSettings:
    load_environment()

    api_key = os.getenv("GEMINI_LLM_API_KEY", "").strip()
    model = os.getenv("GEMINI_LLM_MODEL", "").strip()
    database_url = os.getenv("DATABASE_URL", "").strip()

    if not api_key:
        raise SuggestionConfigurationError("GEMINI_LLM_API_KEY is required")
    if not model:
        raise SuggestionConfigurationError("GEMINI_LLM_MODEL is required")
    if not database_url:
        raise SuggestionConfigurationError("DATABASE_URL is required")

    return SuggestionSettings(api_key=api_key, model=model, database_url=database_url)


class CandidateProfileSuggestionService:
    def __init__(self, *, client: genai.Client, model: str, database_url: str) -> None:
        self._client = client
        self._model = model
        self._database_url = database_url

    def _get_candidate_cv_text(self, user_id: str) -> str:
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT cv_text
                    FROM candidates
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()

        if not row:
            return ""

        value = row[0]
        if not isinstance(value, str):
            return ""

        return value.strip()

    def _extract_pdf_text(self, content: bytes) -> str:
        reader = PdfReader(io.BytesIO(content))
        pages_text: list[str] = []

        for page in reader.pages:
            page_text = page.extract_text() or ""
            clean = page_text.strip()
            if clean:
                pages_text.append(clean)

        return "\n\n".join(pages_text).strip()

    def _download_pdf_content(self, url: str) -> bytes:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise SuggestionGenerationError("La URL del CV no es valida")

        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ATS-FastAPI/1.0)",
            },
        )
        with urlopen(request, timeout=20) as response:  # nosec B310
            return response.read()

    def _normalize_terms(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned_values: list[str] = []

        for value in values:
            cleaned = str(value).strip()
            normalized_key = " ".join(cleaned.split()).casefold()

            if not cleaned or normalized_key in seen:
                continue

            seen.add(normalized_key)
            cleaned_values.append(cleaned)

        return cleaned_values

    async def suggest(
        self,
        *,
        user_id: str,
        behavioral_question_1: str,
        behavioral_question_2: str,
        behavioral_ans_1: str,
        behavioral_ans_2: str,
        cv_file_content: bytes | None,
        cv_existing_url: str | None,
    ) -> CandidateProfileSuggestionResponse:
        cv_text = ""

        if cv_file_content:
            cv_text = await asyncio.to_thread(self._extract_pdf_text, cv_file_content)
        elif cv_existing_url:
            db_cv_text = await asyncio.to_thread(self._get_candidate_cv_text, user_id)
            if db_cv_text:
                cv_text = db_cv_text
            else:
                pdf_content = await asyncio.to_thread(self._download_pdf_content, cv_existing_url)
                cv_text = await asyncio.to_thread(self._extract_pdf_text, pdf_content)

        if not cv_text:
            raise SuggestionGenerationError("No se pudo obtener texto del CV para sugerir")

        prompt = build_candidate_profile_prompt(
            behavioral_question_1=behavioral_question_1,
            behavioral_question_2=behavioral_question_2,
            behavioral_ans_1=behavioral_ans_1,
            behavioral_ans_2=behavioral_ans_2,
            cv_text=cv_text,
        )

        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CandidateProfileSuggestionResponse,
                ),
            )
        except Exception as error:  # pragma: no cover - provider/network
            raise SuggestionGenerationError("No se pudieron generar sugerencias") from error

        parsed = getattr(response, "parsed", None)
        if not isinstance(parsed, CandidateProfileSuggestionResponse):
            raise SuggestionGenerationError("La respuesta del LLM no tiene el formato esperado")

        return CandidateProfileSuggestionResponse(
            technical_skills=self._normalize_terms(parsed.technical_skills),
            soft_skills=self._normalize_terms(parsed.soft_skills),
            values=self._normalize_terms(parsed.values),
        )


@lru_cache(maxsize=1)
def get_candidate_profile_suggestion_service() -> CandidateProfileSuggestionService:
    settings = get_suggestion_settings()
    client = genai.Client(api_key=settings.api_key)
    return CandidateProfileSuggestionService(
        client=client,
        model=settings.model,
        database_url=settings.database_url,
    )
