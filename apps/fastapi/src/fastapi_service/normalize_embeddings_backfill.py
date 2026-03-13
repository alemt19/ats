import logging
import math
import os

import psycopg

from fastapi_service.environment import load_environment

logger = logging.getLogger("fastapi_service.normalize_embeddings_backfill")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

load_environment()


def _parse_vector(vector_literal: str) -> list[float]:
    raw = vector_literal.strip()
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1]

    if not raw:
        return []

    return [float(value.strip()) for value in raw.split(",") if value.strip()]


def _normalize_embedding(embedding: list[float]) -> tuple[list[float], float]:
    squared_norm = sum(value * value for value in embedding)
    norm = math.sqrt(squared_norm)
    if norm == 0.0:
        return embedding, norm
    return [value / norm for value in embedding], norm


def run() -> None:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    batch_size = int(os.getenv("EMBEDDING_NORMALIZATION_BATCH_SIZE", "500"))
    tolerance = float(os.getenv("EMBEDDING_NORMALIZATION_TOLERANCE", "0.001"))

    scanned = 0
    normalized = 0
    already_normalized = 0
    zero_norm = 0
    parse_errors = 0
    last_id = 0

    logger.info(
        "Starting embeddings backfill normalization | batch_size=%s tolerance=%s",
        batch_size,
        tolerance,
    )

    with psycopg.connect(database_url, prepare_threshold=None) as connection:
        with connection.cursor() as cursor:
            while True:
                cursor.execute(
                    """
                    SELECT id, embedding::text
                    FROM global_attributes
                    WHERE embedding IS NOT NULL
                      AND id > %s
                    ORDER BY id
                    LIMIT %s
                    """,
                    (last_id, batch_size),
                )
                rows = cursor.fetchall()

                if not rows:
                    break

                updates: list[tuple[str, int]] = []

                for attribute_id, embedding_text in rows:
                    last_id = int(attribute_id)
                    scanned += 1

                    if embedding_text is None:
                        continue

                    try:
                        embedding = _parse_vector(str(embedding_text))
                    except Exception:
                        parse_errors += 1
                        logger.warning(
                            "Failed to parse embedding for attribute_id=%s", attribute_id
                        )
                        continue

                    normalized_embedding, original_norm = _normalize_embedding(embedding)

                    if original_norm == 0.0:
                        zero_norm += 1
                        logger.warning(
                            "Zero-norm embedding for attribute_id=%s; skipping", attribute_id
                        )
                        continue

                    if abs(original_norm - 1.0) <= tolerance:
                        already_normalized += 1
                        continue

                    vector_literal = (
                        "[" + ",".join(str(value) for value in normalized_embedding) + "]"
                    )
                    updates.append((vector_literal, int(attribute_id)))

                if updates:
                    cursor.executemany(
                        """
                        UPDATE global_attributes
                        SET embedding = %s::vector
                        WHERE id = %s
                        """,
                        updates,
                    )
                    connection.commit()
                    normalized += len(updates)
                    logger.info("Batch committed | normalized=%s scanned=%s", normalized, scanned)

    logger.info(
        (
            "Backfill finished | scanned=%s normalized=%s already_normalized=%s "
            "zero_norm=%s parse_errors=%s"
        ),
        scanned,
        normalized,
        already_normalized,
        zero_norm,
        parse_errors,
    )


if __name__ == "__main__":
    run()
