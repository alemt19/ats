import asyncio
import logging
import os
from typing import Any

import psycopg
from bullmq import Worker
from google import genai
from google.genai import types

from fastapi_service.environment import load_environment

logger = logging.getLogger("fastapi_service.job_summary_worker")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

load_environment()

QUEUE_NAME = "job-summary-embedding"


class JobSummaryWorker:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "")
        self.embedding_model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
        self.embedding_task_type = os.getenv("EMBEDDING_TASK_TYPE", "SEMANTIC_SIMILARITY")
        self.embedding_output_dimensionality = int(
            os.getenv("EMBEDDING_OUTPUT_DIMENSIONALITY", "1536")
        )

        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is required")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required")

        self.client = genai.Client(api_key=api_key)
        logger.info(
            "Job summary worker configured | model=%s dims=%s",
            self.embedding_model,
            self.embedding_output_dimensionality,
        )

    def _fetch_job_data(self, job_id: int) -> dict[str, Any]:
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT j.title, j.description, j.summary
                    FROM jobs j
                    WHERE j.id = %s
                    """,
                    (job_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Job {job_id} not found")

                title, description, summary = row

                cur.execute(
                    """
                    SELECT ga.name, ga.type
                    FROM job_attributes ja
                    JOIN global_attributes ga ON ga.id = ja.attribute_id
                    WHERE ja.job_id = %s
                    """,
                    (job_id,),
                )
                attributes = cur.fetchall()

        hard_skills: list[str] = []
        soft_skills: list[str] = []
        values: list[str] = []

        for name, attr_type in attributes:
            if attr_type == "hard_skill":
                hard_skills.append(name)
            elif attr_type == "soft_skill":
                soft_skills.append(name)
            elif attr_type == "value":
                values.append(name)

        return {
            "title": title or "",
            "description": description or "",
            "summary": summary or "",
            "hard_skills": hard_skills,
            "soft_skills": soft_skills,
            "values": values,
        }

    def _build_composite_text(self, data: dict[str, Any]) -> str:
        parts = [data["title"]]

        if data["description"]:
            parts.append(data["description"])

        if data["summary"]:
            parts.append(data["summary"])

        if data["hard_skills"]:
            parts.append("Technical skills: " + ", ".join(data["hard_skills"]))

        if data["soft_skills"]:
            parts.append("Soft skills: " + ", ".join(data["soft_skills"]))

        if data["values"]:
            parts.append("Values: " + ", ".join(data["values"]))

        return ". ".join(parts)

    def _update_summary_embedding(self, job_id: int, embedding: list[float]) -> None:
        vector_literal = "[" + ",".join(str(v) for v in embedding) + "]"
        with psycopg.connect(self.database_url, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE jobs
                    SET summary_embedding = %s::vector
                    WHERE id = %s
                    """,
                    (vector_literal, job_id),
                )
            conn.commit()
        logger.info("Updated summary_embedding for job %s", job_id)

    async def handler(self, job: Any, _job_token: str) -> bool:
        data = getattr(job, "data", {})
        job_id = int(data.get("jobId", 0))

        if job_id <= 0:
            raise ValueError("Invalid jobId in job payload")

        logger.info("Generating summary embedding for job %s", job_id)

        job_data = await asyncio.to_thread(self._fetch_job_data, job_id)
        composite_text = self._build_composite_text(job_data)

        result = await asyncio.to_thread(
            self.client.models.embed_content,
            model=self.embedding_model,
            contents=[composite_text],
            config=types.EmbedContentConfig(
                task_type=self.embedding_task_type,
                output_dimensionality=self.embedding_output_dimensionality,
            ),
        )

        embeddings_attr = getattr(result, "embeddings", None)
        if not isinstance(embeddings_attr, list) or len(embeddings_attr) == 0:
            raise RuntimeError("Invalid embeddings response from Gemini")

        embedding_values = getattr(embeddings_attr[0], "values", None)
        if not isinstance(embedding_values, list):
            raise RuntimeError("Invalid embedding values from Gemini")

        embedding = list(map(float, embedding_values))
        await asyncio.to_thread(self._update_summary_embedding, job_id, embedding)

        logger.info("Summary embedding generated for job %s", job_id)
        return True


async def main() -> None:
    worker_instance = JobSummaryWorker()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    logger.info("Connecting job summary worker to Redis: %s", redis_url)

    worker = Worker(
        QUEUE_NAME,
        worker_instance.handler,
        {"connection": redis_url, "concurrency": 5},
    )

    logger.info("Job summary embedding worker active")
    try:
        await asyncio.Future()
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
