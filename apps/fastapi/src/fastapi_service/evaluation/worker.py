"""
Evaluation worker: processes candidate-job matching asynchronously via BullMQ.

When a candidate applies to a job:
1. Scores the candidate against the applied job (technical, soft, culture).
2. Finds top-3 semantically similar jobs via summary_embedding (pgvector cosine distance).
3. Scores the candidate against each similar job.
4. Persists all results.
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import psycopg
from bullmq import Worker
from google import genai
from google.genai import types

from fastapi_service.cv_parser import extract_text_from_cv, resolve_cv_format
from fastapi_service.environment import load_environment
from fastapi_service.evaluation.algorithm import analyze_embeddings
from fastapi_service.evaluation.feedback_prompt import build_application_feedback_prompt

logger = logging.getLogger("fastapi_service.evaluation.worker")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

load_environment()

QUEUE_NAME = "evaluation"
TOP_SIMILAR_JOBS = 3
CULTURE_PREFERENCE_WEIGHT = float(os.getenv("CULTURE_PREFERENCE_WEIGHT", "0.5"))
CULTURE_VALUE_WEIGHT = float(os.getenv("CULTURE_VALUE_WEIGHT", "0.5"))
BEHAVIORAL_QUESTION_1_DEFAULT = (
    "Cuentame sobre una ocasion en la que tuviste que lidiar con un conflicto en un equipo. "
    "Cual fue la situacion, como la manejaste y cual fue el resultado?"
)
BEHAVIORAL_QUESTION_2_DEFAULT = (
    "Describe una situacion en la que fallaste o cometiste un error importante. "
    "Como reaccionaste y que aprendiste de esa experiencia?"
)

_FEEDBACK_CULTURE_FIELD_MAP: dict[str, str] = {
    "dress_code": "dress_code",
    "colaboration_style": "collaboration_style",
    "work_pace": "work_pace",
    "level_of_autonomy": "level_of_autonomy",
    "dealing_with_management": "dealing_with_management",
    "level_of_monitoring": "level_of_monitoring",
}

_CULTURE_SCALE_BY_FIELD: dict[str, dict[str, int]] = {
    "dress_code": {
        "casual": 1,
        "semi_formal": 2,
        "semi-formal": 2,
        "formal": 3,
    },
    "colaboration_style": {
        "individual": 1,
        "mixed": 2,
        "highly_collaborative": 3,
    },
    "work_pace": {
        "slow": 1,
        "moderate": 2,
        "accelerated": 3,
    },
    "level_of_autonomy": {
        "high_control": 1,
        "balanced": 2,
        "total_freedom": 3,
    },
    "dealing_with_management": {
        "strictly_professional": 1,
        "friendly_and_approachable": 2,
        "nearby": 3,
    },
    "level_of_monitoring": {
        "daily_monitoring": 1,
        "frequent_monitoring": 2,
        "weekly_goals": 3,
        "biweekly_goals": 4,
        "total_trust": 5,
    },
}

_CULTURE_FIELDS = [
    "dress_code",
    "colaboration_style",
    "work_pace",
    "level_of_autonomy",
    "dealing_with_management",
    "level_of_monitoring",
]


@lru_cache(maxsize=1)
def _load_candidate_culture_preference_catalog() -> list[dict[str, Any]]:
    catalog_path = (
        Path(__file__).resolve().parents[5]
        / "apps"
        / "web"
        / "public"
        / "data"
        / "culture_preference_candidate.json"
    )

    try:
        return json.loads(catalog_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        logger.warning(
            "Candidate culture preference catalog not found at %s",
            catalog_path,
        )
    except json.JSONDecodeError:
        logger.exception(
            "Candidate culture preference catalog is not valid JSON: %s",
            catalog_path,
        )

    return []


@dataclass
class AttributeGroup:
    names: list[str]
    embeddings: list[list[float]]
    mandatory_flags: list[bool]


@dataclass
class JobWeights:
    technical: float
    soft: float
    culture: float


class EvaluationWorker:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "")
        self.llm_model = os.getenv("GEMINI_LLM_MODEL", "").strip()
        self.behavioral_question_1 = (
            os.getenv("behavioral_question_1")
            or os.getenv("BEHAVIORAL_QUESTION_1")
            or BEHAVIORAL_QUESTION_1_DEFAULT
        )
        self.behavioral_question_2 = (
            os.getenv("behavioral_question_2")
            or os.getenv("BEHAVIORAL_QUESTION_2")
            or BEHAVIORAL_QUESTION_2_DEFAULT
        )
        llm_api_key = os.getenv("GEMINI_LLM_API_KEY", "").strip()

        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required")
        if not llm_api_key:
            raise RuntimeError("GEMINI_LLM_API_KEY is required")
        if not self.llm_model:
            raise RuntimeError("GEMINI_LLM_MODEL is required")

        self.client = genai.Client(api_key=llm_api_key)
        logger.info("Evaluation worker configured")

    def _set_evaluation_status(self, application_id: int, status: str) -> None:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE applications SET evaluation_status = %s WHERE id = %s",
                    (status, application_id),
                )
            conn.commit()

    def _fetch_job_weights(self, job_id: int) -> JobWeights:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT weight_technical, weight_soft, weight_culture
                    FROM jobs WHERE id = %s
                    """,
                    (job_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Job {job_id} not found")
                return JobWeights(
                    technical=row[0] or 0.4,
                    soft=row[1] or 0.3,
                    culture=row[2] or 0.3,
                )

    def _fetch_attributes(
        self, entity_type: str, entity_id: int
    ) -> dict[str, AttributeGroup]:
        """
        Fetch attributes grouped by type for a job or candidate.
        entity_type: 'job' or 'candidate'
        """
        if entity_type == "job":
            query = """
                SELECT ga.name, ga.type, ga.embedding::text, COALESCE(ja.is_mandatory, false)
                FROM job_attributes ja
                JOIN global_attributes ga ON ga.id = ja.attribute_id
                WHERE ja.job_id = %s AND ga.embedding IS NOT NULL
            """
        else:
            query = """
                SELECT ga.name, ga.type, ga.embedding::text, false AS is_mandatory
                FROM candidate_attributes ca
                JOIN global_attributes ga ON ga.id = ca.attribute_id
                WHERE ca.candidate_id = %s AND ga.embedding IS NOT NULL
            """

        groups: dict[str, AttributeGroup] = {
            "hard_skill": AttributeGroup(names=[], embeddings=[], mandatory_flags=[]),
            "soft_skill": AttributeGroup(names=[], embeddings=[], mandatory_flags=[]),
            "value": AttributeGroup(names=[], embeddings=[], mandatory_flags=[]),
        }

        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (entity_id,))
                for name, attr_type, embedding_str, is_mandatory in cur.fetchall():
                    if attr_type not in groups:
                        continue
                    embedding = self._parse_vector(embedding_str)
                    groups[attr_type].names.append(name)
                    groups[attr_type].embeddings.append(embedding)
                    groups[attr_type].mandatory_flags.append(bool(is_mandatory))

        # For jobs: fall back to company values when no job-specific values are defined
        if entity_type == "job" and not groups["value"].names:
            self._fill_company_values_fallback(entity_id, groups)

        return groups

    def _fill_company_values_fallback(self, job_id: int, groups: dict[str, AttributeGroup]) -> None:
        """Use company-level value attributes as culture reference when a job has none."""
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT ga.name, ga.embedding::text
                    FROM company_attributes ca
                    JOIN global_attributes ga ON ga.id = ca.attribute_id
                    JOIN jobs j ON j.company_id = ca.company_id
                    WHERE j.id = %s AND ga.type = 'value' AND ga.embedding IS NOT NULL
                    """,
                    (job_id,),
                )
                rows = cur.fetchall()

        if rows:
            logger.info(
                "Job %s has no value attributes; using %d company values as culture fallback",
                job_id, len(rows),
            )
            for name, embedding_str in rows:
                groups["value"].names.append(name)
                groups["value"].embeddings.append(self._parse_vector(embedding_str))
                groups["value"].mandatory_flags.append(False)

    def _update_candidate_cv_text(self, candidate_id: int, text: str) -> None:
        if not text.strip():
            return

        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE candidates SET cv_text = %s WHERE id = %s",
                    (text, candidate_id),
                )
            conn.commit()

    @staticmethod
    def _download_file_content(url: str) -> bytes:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Candidate CV URL is not valid")

        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ATS-FastAPI/1.0)",
            },
        )
        with urlopen(request, timeout=20) as response:  # nosec B310
            return bytes(response.read())

    def _get_candidate_cv_text(
        self,
        candidate_id: int,
        stored_cv_text: str | None,
        cv_file_url: str | None,
    ) -> str:
        cv_text = (stored_cv_text or "").strip()
        if cv_text:
            return cv_text

        if not cv_file_url:
            return ""

        try:
            cv_format = resolve_cv_format(filename=cv_file_url)
            file_content = self._download_file_content(cv_file_url)
            extracted = extract_text_from_cv(
                file_content,
                filename=cv_file_url,
                content_type=(
                    "application/pdf"
                    if cv_format == "pdf"
                    else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
            ).strip()
            if extracted:
                self._update_candidate_cv_text(candidate_id, extracted)
            return extracted
        except Exception:
            logger.exception(
                "Could not extract CV text for candidate %s from %s",
                candidate_id,
                cv_file_url,
            )
            return ""

    @staticmethod
    def _externalize_culture_preferences(
        preferences: dict[str, str | None],
    ) -> dict[str, str | None]:
        return {
            _FEEDBACK_CULTURE_FIELD_MAP.get(field_name, field_name): value
            for field_name, value in preferences.items()
        }

    def _fetch_candidate_feedback_context(
        self,
        candidate_id: int,
        cand_attrs: dict[str, AttributeGroup],
    ) -> dict[str, Any]:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        name,
                        lastname,
                        cv_text,
                        cv_file_url,
                        behavioral_ans_1,
                        behavioral_ans_2,
                        dress_code,
                        collaboration_style,
                        work_pace,
                        level_of_autonomy,
                        dealing_with_management,
                        level_of_monitoring
                    FROM candidates
                    WHERE id = %s
                    """,
                    (candidate_id,),
                )
                row = cur.fetchone()

        if not row:
            raise ValueError(f"Candidate {candidate_id} not found")

        cv_text = self._get_candidate_cv_text(candidate_id, row[2], row[3])

        return {
            "nombre": " ".join(part for part in [row[0], row[1]] if part).strip(),
            "cv_text": cv_text,
            "pregunta_conductual_1": self.behavioral_question_1,
            "pregunta_conductual_2": self.behavioral_question_2,
            "respuesta_conductual_1": row[4] or "",
            "respuesta_conductual_2": row[5] or "",
            "preferencias_culturales": {
                "dress_code": row[6],
                "collaboration_style": row[7],
                "work_pace": row[8],
                "level_of_autonomy": row[9],
                "dealing_with_management": row[10],
                "level_of_monitoring": row[11],
            },
            "habilidades_tecnicas": cand_attrs["hard_skill"].names,
            "habilidades_blandas": cand_attrs["soft_skill"].names,
            "valores": cand_attrs["value"].names,
        }

    def _fetch_company_feedback_context(self, job_id: int) -> dict[str, Any]:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        comp.id,
                        comp.name,
                        comp.description,
                        comp.mision,
                        comp.dress_code,
                        comp.colaboration_style,
                        comp.work_pace,
                        comp.level_of_autonomy,
                        comp.dealing_with_management,
                        comp.level_of_monitoring
                    FROM jobs j
                    LEFT JOIN companies comp ON comp.id = j.company_id
                    WHERE j.id = %s
                    """,
                    (job_id,),
                )
                company_row = cur.fetchone()

                if not company_row:
                    raise ValueError(f"Could not fetch company context for job {job_id}")

                company_id = company_row[0]
                values: list[str] = []
                if company_id is not None:
                    cur.execute(
                        """
                        SELECT ga.name
                        FROM company_attributes ca
                        JOIN global_attributes ga ON ga.id = ca.attribute_id
                        WHERE ca.company_id = %s AND ga.type = 'value'
                        ORDER BY ga.name ASC
                        """,
                        (company_id,),
                    )
                    values = [name for (name,) in cur.fetchall() if name]

        return {
            "nombre": company_row[1] or "",
            "descripcion": company_row[2] or "",
            "mision": company_row[3] or "",
            "preferencias_culturales": {
                "dress_code": company_row[4],
                "collaboration_style": company_row[5],
                "work_pace": company_row[6],
                "level_of_autonomy": company_row[7],
                "dealing_with_management": company_row[8],
                "level_of_monitoring": company_row[9],
            },
            "valores": values,
        }

    def _fetch_job_feedback_context(
        self,
        job_id: int,
        job_attrs: dict[str, AttributeGroup],
        weights: JobWeights,
    ) -> dict[str, Any]:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        title,
                        description,
                        position,
                        workplace_type,
                        employment_type,
                        weight_technical,
                        weight_soft,
                        weight_culture
                    FROM jobs
                    WHERE id = %s
                    """,
                    (job_id,),
                )
                row = cur.fetchone()

        if not row:
            raise ValueError(f"Job {job_id} not found")

        return {
            "title": row[0] or "",
            "description": row[1] or "",
            "position": row[2] or "",
            "workplace_type": row[3],
            "employment_type": row[4],
            "weight_technical": row[5] or weights.technical,
            "weight_soft": row[6] or weights.soft,
            "weight_culture": row[7] or weights.culture,
            "habilidades_tecnicas": job_attrs["hard_skill"].names,
            "habilidades_blandas": job_attrs["soft_skill"].names,
        }

    @staticmethod
    def _normalize_feedback_title(title: Any) -> str:
        cleaned = " ".join(str(title).replace("_", " ").split())
        if not cleaned:
            return ""
        return cleaned[0].upper() + cleaned[1:]

    def _normalize_ai_feedback_payload(self, payload: Any) -> dict[str, str]:
        if not isinstance(payload, dict):
            raise ValueError("LLM feedback payload must be a JSON object")

        normalized: dict[str, str] = {}

        for raw_title, raw_paragraph in payload.items():
            title = self._normalize_feedback_title(raw_title)
            paragraph = " ".join(str(raw_paragraph).split())

            if not title or not paragraph:
                continue

            unique_title = title
            suffix = 2
            while unique_title in normalized:
                unique_title = f"{title} {suffix}"
                suffix += 1

            normalized[unique_title] = paragraph

        if not normalized:
            raise ValueError("LLM feedback payload does not contain usable sections")

        return normalized

    def _update_application_ai_feedback(
        self,
        application_id: int,
        ai_feedback: dict[str, str],
    ) -> None:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE applications SET ai_feedback = %s::jsonb WHERE id = %s",
                    (json.dumps(ai_feedback, ensure_ascii=False), application_id),
                )
            conn.commit()

    def _generate_application_ai_feedback(
        self,
        application_id: int,
        job_id: int,
        candidate_id: int,
        scores: dict[str, Any],
        job_attrs: dict[str, AttributeGroup],
        cand_attrs: dict[str, AttributeGroup],
        weights: JobWeights,
        preloaded_culture_prefs: tuple[dict[str, str | None], dict[str, str | None]] | None = None,
    ) -> dict[str, str]:
        if preloaded_culture_prefs is not None:
            company_preferences, candidate_preferences = preloaded_culture_prefs
        else:
            company_preferences, candidate_preferences = self._fetch_culture_preferences(
                job_id,
                candidate_id,
            )
        candidate_context = self._fetch_candidate_feedback_context(candidate_id, cand_attrs)
        company_context = self._fetch_company_feedback_context(job_id)
        job_context = self._fetch_job_feedback_context(job_id, job_attrs, weights)

        candidate_context["preferencias_culturales"] = self._externalize_culture_preferences(
            candidate_preferences,
        )
        company_context["preferencias_culturales"] = self._externalize_culture_preferences(
            company_preferences,
        )

        prompt = build_application_feedback_prompt(
            scores={
                "match_technical_score": float(scores["match_technical_score"]),
                "match_soft_score": float(scores["match_soft_score"]),
                "match_culture_score": float(scores["match_culture_score"]),
                "overall_score": float(scores["overall_score"]),
            },
            candidate_context=candidate_context,
            company_context=company_context,
            job_context=job_context,
            culture_preference_catalog=_load_candidate_culture_preference_catalog(),
        )

        response = self.client.models.generate_content(
            model=self.llm_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, dict):
            return self._normalize_ai_feedback_payload(parsed)

        response_text = getattr(response, "text", "")
        if not response_text:
            raise ValueError(
                f"LLM did not return ai_feedback for application {application_id}"
            )

        return self._normalize_ai_feedback_payload(json.loads(response_text))

    @staticmethod
    def _parse_vector(vector_str: str) -> list[float]:
        """Parse PostgreSQL vector string like '[0.1,0.2,...]' to list of floats."""
        cleaned = vector_str.strip("[]")
        return [float(x) for x in cleaned.split(",")]

    def _fetch_culture_preferences(
        self, job_id: int, candidate_id: int
    ) -> tuple[dict[str, str | None], dict[str, str | None]]:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        comp.dress_code,
                        comp.colaboration_style,
                        comp.work_pace,
                        comp.level_of_autonomy,
                        comp.dealing_with_management,
                        comp.level_of_monitoring,
                        cand.dress_code,
                        cand.collaboration_style,
                        cand.work_pace,
                        cand.level_of_autonomy,
                        cand.dealing_with_management,
                        cand.level_of_monitoring
                    FROM jobs j
                    LEFT JOIN companies comp ON comp.id = j.company_id
                    JOIN candidates cand ON cand.id = %s
                    WHERE j.id = %s
                    """,
                    (candidate_id, job_id),
                )
                row = cur.fetchone()

        if not row:
            raise ValueError(
                f"Could not fetch culture preferences for job={job_id} candidate={candidate_id}"
            )

        company_preferences: dict[str, str | None] = {
            "dress_code": row[0],
            "colaboration_style": row[1],
            "work_pace": row[2],
            "level_of_autonomy": row[3],
            "dealing_with_management": row[4],
            "level_of_monitoring": row[5],
        }
        candidate_preferences: dict[str, str | None] = {
            "dress_code": row[6],
            "colaboration_style": row[7],
            "work_pace": row[8],
            "level_of_autonomy": row[9],
            "dealing_with_management": row[10],
            "level_of_monitoring": row[11],
        }
        return company_preferences, candidate_preferences

    def _calculate_culture_preference_score(
        self,
        company_preferences: dict[str, str | None],
        candidate_preferences: dict[str, str | None],
    ) -> float:
        scores: list[float] = []

        for field_name in _CULTURE_FIELDS:
            candidate_value = candidate_preferences.get(field_name)
            company_value = company_preferences.get(field_name)

            if candidate_value == "indifferent":
                scores.append(1.0)
                logger.info(
                    "Culture preference %s | candidate=%s company=%s score=%.3f",
                    field_name,
                    candidate_value,
                    company_value,
                    1.0,
                )
                continue

            if candidate_value is None or company_value is None:
                scores.append(0.0)
                logger.info(
                    "Culture preference %s | candidate=%s company=%s score=%.3f",
                    field_name,
                    candidate_value,
                    company_value,
                    0.0,
                )
                continue

            scale = _CULTURE_SCALE_BY_FIELD[field_name]
            candidate_numeric = scale.get(candidate_value)
            company_numeric = scale.get(company_value)

            if candidate_numeric is None or company_numeric is None:
                scores.append(0.0)
                logger.info(
                    "Culture preference %s | candidate=%s company=%s score=%.3f",
                    field_name,
                    candidate_value,
                    company_value,
                    0.0,
                )
                continue

            score = abs(candidate_numeric - company_numeric) / company_numeric
            scores.append(score)
            logger.info(
                "Culture preference %s | candidate=%s company=%s score=%.3f",
                field_name,
                candidate_value,
                company_value,
                score,
            )

        if not scores:
            return 0.0

        return sum(scores) / len(scores)

    def _evaluate_candidate_for_job(
        self,
        job_id: int,
        candidate_id: int,
        job_attrs: dict[str, AttributeGroup],
        cand_attrs: dict[str, AttributeGroup],
        weights: JobWeights,
        preloaded_culture_prefs: tuple[dict[str, str | None], dict[str, str | None]] | None = None,
    ) -> dict[str, Any]:
        """Calculate match scores for a candidate against a job."""
        tech_result = analyze_embeddings(
            job_attrs["hard_skill"].names,
            cand_attrs["hard_skill"].names,
            job_attrs["hard_skill"].embeddings,
            cand_attrs["hard_skill"].embeddings,
            job_attrs["hard_skill"].mandatory_flags,
        )

        soft_result = analyze_embeddings(
            job_attrs["soft_skill"].names,
            cand_attrs["soft_skill"].names,
            job_attrs["soft_skill"].embeddings,
            cand_attrs["soft_skill"].embeddings,
            job_attrs["soft_skill"].mandatory_flags,
        )

        culture_values_result = analyze_embeddings(
            job_attrs["value"].names,
            cand_attrs["value"].names,
            job_attrs["value"].embeddings,
            cand_attrs["value"].embeddings,
            job_attrs["value"].mandatory_flags,
        )

        if preloaded_culture_prefs is not None:
            company_preferences, candidate_preferences = preloaded_culture_prefs
        else:
            company_preferences, candidate_preferences = self._fetch_culture_preferences(
                job_id, candidate_id
            )
        culture_preference_score = self._calculate_culture_preference_score(
            company_preferences, candidate_preferences
        )

        culture_final_score = (
            culture_preference_score * CULTURE_PREFERENCE_WEIGHT
            + culture_values_result.final_score * CULTURE_VALUE_WEIGHT
        )

        logger.info(
            (
                "Culture score blend | preference=%.3f values=%.3f pref_weight=%.3f "
                "value_weight=%.3f final=%.3f"
            ),
            culture_preference_score,
            culture_values_result.final_score,
            CULTURE_PREFERENCE_WEIGHT,
            CULTURE_VALUE_WEIGHT,
            culture_final_score,
        )

        overall = (
            tech_result.final_score * weights.technical
            + soft_result.final_score * weights.soft
            + culture_final_score * weights.culture
        )

        return {
            "match_technical_score": tech_result.final_score,
            "match_soft_score": soft_result.final_score,
            "match_culture_score": culture_final_score,
            "overall_score": overall,
        }

    def _update_application_scores(
        self, application_id: int, scores: dict[str, Any]
    ) -> None:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE applications
                    SET match_technical_score = %s,
                        match_soft_score = %s,
                        match_culture_score = %s,
                        overall_score = %s
                    WHERE id = %s
                    """,
                    (
                        scores["match_technical_score"],
                        scores["match_soft_score"],
                        scores["match_culture_score"],
                        scores["overall_score"],
                        application_id,
                    ),
                )
            conn.commit()

    def _find_similar_jobs(self, job_id: int, limit: int = TOP_SIMILAR_JOBS) -> list[tuple[int, float]]:
        """Find top N similar jobs using pgvector cosine distance on summary_embedding."""
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                # Check if the applied job has a summary_embedding
                cur.execute(
                    "SELECT summary_embedding IS NOT NULL FROM jobs WHERE id = %s",
                    (job_id,),
                )
                row = cur.fetchone()
                if not row or not row[0]:
                    logger.info("Job %s has no summary_embedding, skipping similar jobs", job_id)
                    return []

                # Find similar jobs using cosine distance operator (<=>)
                cur.execute(
                    """
                    SELECT id, (summary_embedding <=> (SELECT summary_embedding FROM jobs WHERE id = %s)) AS distance
                    FROM jobs
                    WHERE id != %s
                      AND status = 'published'
                      AND summary_embedding IS NOT NULL
                    ORDER BY distance ASC
                    LIMIT %s
                    """,
                    (job_id, job_id, limit),
                )
                results = cur.fetchall()

        # Convert cosine distance to similarity (1 - distance)
        return [(row[0], 1.0 - row[1]) for row in results]

    def _insert_similar_job_analysis(
        self,
        application_id: int,
        similar_job_id: int,
        similarity_score: float,
        scores: dict[str, Any],
        rank: int,
    ) -> None:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO application_similar_jobs
                        (application_id, similar_job_id, similarity_score,
                         match_technical_score, match_soft_score, match_culture_score,
                         overall_score, rank)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (application_id, similar_job_id) DO UPDATE SET
                        similarity_score = EXCLUDED.similarity_score,
                        match_technical_score = EXCLUDED.match_technical_score,
                        match_soft_score = EXCLUDED.match_soft_score,
                        match_culture_score = EXCLUDED.match_culture_score,
                        overall_score = EXCLUDED.overall_score,
                        rank = EXCLUDED.rank
                    """,
                    (
                        application_id,
                        similar_job_id,
                        similarity_score,
                        scores["match_technical_score"],
                        scores["match_soft_score"],
                        scores["match_culture_score"],
                        scores["overall_score"],
                        rank,
                    ),
                )
            conn.commit()

    async def handler(self, job: Any, _job_token: str) -> bool:
        data = getattr(job, "data", {})
        application_id = int(data.get("applicationId", 0))
        candidate_id = int(data.get("candidateId", 0))
        job_id = int(data.get("jobId", 0))

        if not all([application_id, candidate_id, job_id]):
            raise ValueError("applicationId, candidateId, and jobId are required")

        logger.info(
            "Evaluating application=%s candidate=%s job=%s",
            application_id, candidate_id, job_id,
        )

        try:
            await asyncio.to_thread(
                self._set_evaluation_status, application_id, "processing"
            )

            # Fetch all independent data in parallel: attrs, weights, culture prefs
            job_attrs, cand_attrs, weights, culture_prefs = await asyncio.gather(
                asyncio.to_thread(self._fetch_attributes, "job", job_id),
                asyncio.to_thread(self._fetch_attributes, "candidate", candidate_id),
                asyncio.to_thread(self._fetch_job_weights, job_id),
                asyncio.to_thread(self._fetch_culture_preferences, job_id, candidate_id),
            )

            # Evaluate for the applied job (uses preloaded culture prefs — no extra DB call)
            scores = await asyncio.to_thread(
                self._evaluate_candidate_for_job,
                job_id,
                candidate_id,
                job_attrs,
                cand_attrs,
                weights,
                culture_prefs,
            )
            await asyncio.to_thread(
                self._update_application_scores, application_id, scores
            )

            logger.info(
                "Applied job scores: tech=%.3f soft=%.3f culture=%.3f overall=%.3f",
                scores["match_technical_score"],
                scores["match_soft_score"],
                scores["match_culture_score"],
                scores["overall_score"],
            )

            # Run LLM feedback and pgvector similarity search in parallel
            ai_feedback, similar_jobs = await asyncio.gather(
                asyncio.to_thread(
                    self._generate_application_ai_feedback,
                    application_id,
                    job_id,
                    candidate_id,
                    scores,
                    job_attrs,
                    cand_attrs,
                    weights,
                    culture_prefs,
                ),
                asyncio.to_thread(self._find_similar_jobs, job_id),
            )

            await asyncio.to_thread(
                self._update_application_ai_feedback,
                application_id,
                ai_feedback,
            )
            logger.info(
                "Application %s ai_feedback updated with %d sections",
                application_id,
                len(ai_feedback),
            )

            # Evaluate similar jobs in parallel (each fetches its own attrs+weights concurrently)
            if similar_jobs:
                async def _process_one_similar_job(
                    rank: int, similar_job_id: int, similarity_score: float
                ) -> None:
                    similar_job_attrs, similar_weights = await asyncio.gather(
                        asyncio.to_thread(self._fetch_attributes, "job", similar_job_id),
                        asyncio.to_thread(self._fetch_job_weights, similar_job_id),
                    )
                    similar_scores = await asyncio.to_thread(
                        self._evaluate_candidate_for_job,
                        similar_job_id,
                        candidate_id,
                        similar_job_attrs,
                        cand_attrs,
                        similar_weights,
                    )
                    await asyncio.to_thread(
                        self._insert_similar_job_analysis,
                        application_id, similar_job_id, similarity_score,
                        similar_scores, rank,
                    )
                    logger.info(
                        "Similar job #%d (id=%s, sim=%.3f): overall=%.3f",
                        rank, similar_job_id, similarity_score,
                        similar_scores["overall_score"],
                    )

                await asyncio.gather(*[
                    _process_one_similar_job(rank, similar_job_id, similarity_score)
                    for rank, (similar_job_id, similarity_score) in enumerate(similar_jobs, start=1)
                ])

            await asyncio.to_thread(
                self._set_evaluation_status, application_id, "completed"
            )
            logger.info("Evaluation completed for application %s", application_id)
            return True

        except Exception:
            logger.exception(
                "Evaluation failed for application %s", application_id
            )
            await asyncio.to_thread(
                self._set_evaluation_status, application_id, "failed"
            )
            raise
        finally:
            # 2. Forzar al worker a esperar antes de quedar "libre"
            logger.info("Tarea terminada. Esperando 30s antes de permitir la siguiente...")
            await asyncio.sleep(30)


async def main() -> None:
    worker_instance = EvaluationWorker()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    logger.info("Connecting evaluation worker to Redis: %s", redis_url)

    worker = Worker(
        QUEUE_NAME,
        worker_instance.handler,
        {
            "connection": redis_url,
            "concurrency": 1,
            "lockDuration": 300_000,
            "stalledInterval": 60_000,
            "maxStalledCount": 2_147_483_647,
        },
    )

    logger.info("Evaluation worker active")
    try:
        await asyncio.Future()
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
