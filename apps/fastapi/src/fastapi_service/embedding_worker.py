import asyncio
import logging
import math
import os
from dataclasses import dataclass
from typing import Any

import psycopg
from bullmq import Worker
from google import genai
from google.genai import types

from fastapi_service.environment import load_environment

logger = logging.getLogger("fastapi_service.embedding_worker")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

load_environment()


@dataclass
class JobEnvelope:
    job: Any
    future: asyncio.Future[bool]


class GeminiBatchWorker:
    def __init__(self) -> None:
        self.queue_buffer: list[JobEnvelope] = []
        self.max_batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", "50"))
        self.wait_time = float(os.getenv("EMBEDDING_BATCH_WAIT_SECONDS", "2.0"))
        self.lock = asyncio.Lock()
        self.timer: asyncio.TimerHandle | None = None
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
            "Gemini worker configured | model=%s task_type=%s dims=%s batch_size=%s wait=%ss",
            self.embedding_model,
            self.embedding_task_type,
            self.embedding_output_dimensionality,
            self.max_batch_size,
            self.wait_time,
        )

    def _extract_embeddings(self, result: Any, expected_len: int) -> list[list[float]]:
        if isinstance(result, dict):
            embedding = result.get("embedding")
            if isinstance(embedding, list):
                if len(embedding) > 0 and isinstance(embedding[0], dict):
                    values = [item.get("values") for item in embedding]
                    parsed = [list(map(float, item)) for item in values if isinstance(item, list)]
                    if len(parsed) == expected_len:
                        return parsed
                if (
                    len(embedding) > 0
                    and isinstance(embedding[0], (int, float))
                    and expected_len == 1
                ):
                    return [list(map(float, embedding))]

            embeddings = result.get("embeddings")
            if isinstance(embeddings, list):
                parsed_from_dict_embeddings: list[list[float]] = []
                for item in embeddings:
                    if isinstance(item, dict):
                        values = item.get("values") or item.get("embedding")
                        if isinstance(values, list):
                            parsed_from_dict_embeddings.append(list(map(float, values)))

                if len(parsed_from_dict_embeddings) == expected_len:
                    return parsed_from_dict_embeddings

        embeddings_attr = getattr(result, "embeddings", None)
        if isinstance(embeddings_attr, list):
            parsed_embeddings: list[list[float]] = []
            for item in embeddings_attr:
                values = getattr(item, "values", None)
                if isinstance(values, list):
                    parsed_embeddings.append(list(map(float, values)))
            if len(parsed_embeddings) == expected_len:
                return parsed_embeddings

        embedding_attr = getattr(result, "embedding", None)
        if (
            isinstance(embedding_attr, list)
            and len(embedding_attr) > 0
            and isinstance(embedding_attr[0], (int, float))
            and expected_len == 1
        ):
            return [list(map(float, embedding_attr))]

        result_dict = None
        if hasattr(result, "to_dict") and callable(result.to_dict):
            try:
                result_dict = result.to_dict()
            except Exception:
                result_dict = None

        if isinstance(result_dict, dict):
            dict_embeddings = result_dict.get("embeddings")
            if isinstance(dict_embeddings, list):
                parsed_from_to_dict: list[list[float]] = []
                for item in dict_embeddings:
                    if isinstance(item, dict):
                        values = item.get("values") or item.get("embedding")
                        if isinstance(values, list):
                            parsed_from_to_dict.append(list(map(float, values)))

                if len(parsed_from_to_dict) == expected_len:
                    return parsed_from_to_dict

        logger.error(
            "Unexpected Gemini embeddings response | type=%s | preview=%s",
            type(result).__name__,
            str(result)[:500],
        )

        raise RuntimeError("Invalid embeddings response format from Gemini")

    def _update_embeddings_in_db(self, updates: list[tuple[int, list[float]]]) -> None:
        with psycopg.connect(self.database_url, prepare_threshold=None) as connection:
            with connection.cursor() as cursor:
                for attribute_id, embedding in updates:
                    vector_literal = "[" + ",".join(str(value) for value in embedding) + "]"
                    cursor.execute(
                        """
                        UPDATE global_attributes
                        SET embedding = %s::vector
                        WHERE id = %s
                        """,
                        (vector_literal, attribute_id),
                    )
            connection.commit()
        logger.info("Updated embeddings in DB for %s attribute(s)", len(updates))

    def _normalize_embedding(self, embedding: list[float]) -> list[float]:
        # Normalize to unit length so cosine similarity reflects direction only.
        squared_norm = sum(value * value for value in embedding)
        norm = math.sqrt(squared_norm)
        if norm == 0.0:
            logger.warning("Received zero-norm embedding; storing without normalization")
            return embedding
        return [value / norm for value in embedding]

    def _normalize_embeddings(self, embeddings: list[list[float]]) -> list[list[float]]:
        return [self._normalize_embedding(embedding) for embedding in embeddings]

    async def process_batch(self) -> None:
        async with self.lock:
            if not self.queue_buffer:
                return

            current_batch = list(self.queue_buffer)
            self.queue_buffer.clear()

            if self.timer:
                self.timer.cancel()
                self.timer = None

        texts: list[str] = []
        attribute_ids: list[int] = []

        for item in current_batch:
            data = getattr(item.job, "data", {})
            name = str(data.get("name", "")).strip()
            attribute_id = int(data.get("attributeId", 0))

            if not name or attribute_id <= 0:
                if not item.future.done():
                    item.future.set_exception(RuntimeError("Invalid job payload"))
                continue

            texts.append(name)
            attribute_ids.append(attribute_id)

        if not texts:
            logger.warning("Batch had no valid jobs; nothing to process")
            return

        try:
            logger.info("Processing batch with %s item(s)", len(texts))
            result = await asyncio.to_thread(
                self.client.models.embed_content,
                model=self.embedding_model,
                contents=texts,
                config=types.EmbedContentConfig(
                    # task_type=self.embedding_task_type,
                    output_dimensionality=self.embedding_output_dimensionality,
                ),
            )
            embeddings = self._extract_embeddings(result, len(texts))
            normalized_embeddings = self._normalize_embeddings(embeddings)

            updates = list(zip(attribute_ids, normalized_embeddings, strict=False))
            await asyncio.to_thread(self._update_embeddings_in_db, updates)

            update_by_id = {attribute_id: embedding for attribute_id, embedding in updates}
            for item in current_batch:
                data = getattr(item.job, "data", {})
                attribute_id = int(data.get("attributeId", 0))

                if attribute_id in update_by_id and not item.future.done():
                    item.future.set_result(True)
            logger.info("Batch completed successfully")
        except Exception as error:
            logger.exception("Batch processing failed: %s", error)
            for item in current_batch:
                if not item.future.done():
                    item.future.set_exception(error)

    async def handler(self, job: Any, _job_token: str) -> bool:
        loop = asyncio.get_running_loop()
        job_finished_future: asyncio.Future[bool] = loop.create_future()

        async with self.lock:
            self.queue_buffer.append(JobEnvelope(job=job, future=job_finished_future))
            logger.info("Job buffered | queue_size=%s", len(self.queue_buffer))

            if len(self.queue_buffer) >= self.max_batch_size:
                asyncio.create_task(self.process_batch())
            else:
                if self.timer:
                    self.timer.cancel()
                self.timer = loop.call_later(
                    self.wait_time,
                    lambda: asyncio.create_task(self.process_batch()),
                )

        return await job_finished_future


async def main() -> None:
    collector = GeminiBatchWorker()
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    concurrency = int(os.getenv("EMBEDDING_WORKER_CONCURRENCY", "50"))

    logger.info("Connecting worker to Redis: %s", redis_url)

    worker = Worker(
        "embeddings_queue",
        collector.handler,
        {
            "connection": redis_url,
            "concurrency": max(concurrency, collector.max_batch_size),
            "lockDuration": 300_000,
            "stalledInterval": 60_000,
            "maxStalledCount": 2_147_483_647,
        },
    )

    logger.info("🚀 Embeddings worker con batching activo")
    try:
        await asyncio.Future()
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
