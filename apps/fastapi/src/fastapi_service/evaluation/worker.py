"""
Evaluation worker: processes candidate-job matching asynchronously via BullMQ.

When a candidate applies to a job:
1. Scores the candidate against the applied job (technical, soft, culture).
2. Finds top-3 semantically similar jobs via summary_embedding (pgvector cosine distance).
3. Scores the candidate against each similar job.
4. Persists all results.
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any

import psycopg
from bullmq import Worker

from fastapi_service.environment import load_environment
from fastapi_service.evaluation.algorithm import MatchResult, analyze_embeddings

logger = logging.getLogger("fastapi_service.evaluation.worker")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

load_environment()

QUEUE_NAME = "evaluation"
TOP_SIMILAR_JOBS = 3


@dataclass
class AttributeGroup:
    names: list[str]
    embeddings: list[list[float]]


@dataclass
class JobWeights:
    technical: float
    soft: float
    culture: float


class EvaluationWorker:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required")
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
                SELECT ga.name, ga.type, ga.embedding::text
                FROM job_attributes ja
                JOIN global_attributes ga ON ga.id = ja.attribute_id
                WHERE ja.job_id = %s AND ga.embedding IS NOT NULL
            """
        else:
            query = """
                SELECT ga.name, ga.type, ga.embedding::text
                FROM candidate_attributes ca
                JOIN global_attributes ga ON ga.id = ca.attribute_id
                WHERE ca.candidate_id = %s AND ga.embedding IS NOT NULL
            """

        groups: dict[str, AttributeGroup] = {
            "hard_skill": AttributeGroup(names=[], embeddings=[]),
            "soft_skill": AttributeGroup(names=[], embeddings=[]),
            "value": AttributeGroup(names=[], embeddings=[]),
        }

        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (entity_id,))
                for name, attr_type, embedding_str in cur.fetchall():
                    if attr_type not in groups:
                        continue
                    embedding = self._parse_vector(embedding_str)
                    groups[attr_type].names.append(name)
                    groups[attr_type].embeddings.append(embedding)

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

    @staticmethod
    def _parse_vector(vector_str: str) -> list[float]:
        """Parse PostgreSQL vector string like '[0.1,0.2,...]' to list of floats."""
        cleaned = vector_str.strip("[]")
        return [float(x) for x in cleaned.split(",")]

    def _evaluate_candidate_for_job(
        self,
        job_attrs: dict[str, AttributeGroup],
        cand_attrs: dict[str, AttributeGroup],
        weights: JobWeights,
    ) -> dict[str, Any]:
        """Calculate match scores for a candidate against a job."""
        tech_result = analyze_embeddings(
            job_attrs["hard_skill"].names,
            cand_attrs["hard_skill"].names,
            job_attrs["hard_skill"].embeddings,
            cand_attrs["hard_skill"].embeddings,
        )

        soft_result = analyze_embeddings(
            job_attrs["soft_skill"].names,
            cand_attrs["soft_skill"].names,
            job_attrs["soft_skill"].embeddings,
            cand_attrs["soft_skill"].embeddings,
        )

        culture_result = analyze_embeddings(
            job_attrs["value"].names,
            cand_attrs["value"].names,
            job_attrs["value"].embeddings,
            cand_attrs["value"].embeddings,
        )

        overall = (
            tech_result.final_score * weights.technical
            + soft_result.final_score * weights.soft
            + culture_result.final_score * weights.culture
        )

        return {
            "match_technical_score": tech_result.final_score,
            "match_soft_score": soft_result.final_score,
            "match_culture_score": culture_result.final_score,
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

            # Fetch attributes for the applied job and candidate
            job_attrs = await asyncio.to_thread(
                self._fetch_attributes, "job", job_id
            )
            cand_attrs = await asyncio.to_thread(
                self._fetch_attributes, "candidate", candidate_id
            )
            weights = await asyncio.to_thread(self._fetch_job_weights, job_id)

            # Evaluate for the applied job
            scores = await asyncio.to_thread(
                self._evaluate_candidate_for_job, job_attrs, cand_attrs, weights
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

            # Find and evaluate similar jobs
            similar_jobs = await asyncio.to_thread(
                self._find_similar_jobs, job_id
            )

            for rank, (similar_job_id, similarity_score) in enumerate(similar_jobs, start=1):
                similar_job_attrs = await asyncio.to_thread(
                    self._fetch_attributes, "job", similar_job_id
                )
                similar_weights = await asyncio.to_thread(
                    self._fetch_job_weights, similar_job_id
                )
                similar_scores = await asyncio.to_thread(
                    self._evaluate_candidate_for_job,
                    similar_job_attrs, cand_attrs, similar_weights,
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


async def main() -> None:
    worker_instance = EvaluationWorker()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    logger.info("Connecting evaluation worker to Redis: %s", redis_url)

    worker = Worker(
        QUEUE_NAME,
        worker_instance.handler,
        {"connection": redis_url, "concurrency": 5},
    )

    logger.info("Evaluation worker active")
    try:
        await asyncio.Future()
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
