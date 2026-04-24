"""
generate-seed-embeddings.py

Genera embeddings via Gemini API para:
  1. global_attributes (hard_skill, soft_skill, value) que no tienen embedding
  2. jobs que no tienen summary_embedding (texto compuesto de título + descripción + skills)

Debe ejecutarse DESPUÉS de prisma db seed y ANTES de trigger-evaluations.

Uso:
  cd apps/fastapi
  uv run python scripts/generate-seed-embeddings.py

Variables de entorno requeridas (en apps/fastapi/.env o apps/api/.env):
  DATABASE_URL  — PostgreSQL connection string
  GEMINI_API_KEY — Google Gemini API key

Opcionales (igual que el worker):
  GEMINI_EMBEDDING_MODEL        (default: gemini-embedding-001)
  EMBEDDING_OUTPUT_DIMENSIONALITY (default: 1536)
  EMBEDDING_BATCH_SIZE          (default: 50)
"""

import logging
import math
import os
import sys
import time
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from google import genai
from google.genai import types

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("generate-seed-embeddings")

# ─── Cargar .env ──────────────────────────────────────────────────────────────

def load_env() -> None:
    candidates = [
        Path(__file__).parents[2] / ".env",          # apps/fastapi/.env
        Path(__file__).parents[3] / "apps/fastapi/.env",  # apps/api/.env desde raíz
        Path(__file__).parents[3] / ".env",           # raíz del monorepo
    ]
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path)
            logger.info("Cargado .env desde: %s", env_path)
            break

# ─── Configuración ────────────────────────────────────────────────────────────

load_env()

DATABASE_URL = os.getenv("DATABASE_URL", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
OUTPUT_DIMENSIONALITY = int(os.getenv("EMBEDDING_OUTPUT_DIMENSIONALITY", "1536"))
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))

if not DATABASE_URL:
    logger.error("DATABASE_URL no está definida")
    sys.exit(1)

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY no está definida")
    sys.exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

# ─── Utilidades ───────────────────────────────────────────────────────────────

def normalize(embedding: list[float]) -> list[float]:
    """Normaliza a longitud unitaria para cosine similarity."""
    norm = math.sqrt(sum(v * v for v in embedding))
    if norm == 0.0:
        return embedding
    return [v / norm for v in embedding]


def to_vector_literal(embedding: list[float]) -> str:
    """Convierte lista a formato de pgvector: '[v1,v2,...]'"""
    return "[" + ",".join(f"{v:.10f}" for v in embedding) + "]"


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Genera embeddings para un batch de textos via Gemini API."""
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            output_dimensionality=OUTPUT_DIMENSIONALITY,
        ),
    )
    # Extraer embeddings del resultado (manejo robusto de distintos formatos)
    embeddings_attr = getattr(result, "embeddings", None)
    if isinstance(embeddings_attr, list) and len(embeddings_attr) == len(texts):
        parsed = []
        for item in embeddings_attr:
            values = getattr(item, "values", None)
            if isinstance(values, list):
                parsed.append(list(map(float, values)))
        if len(parsed) == len(texts):
            return parsed

    # Fallback: dict format
    if isinstance(result, dict):
        embeddings = result.get("embeddings", [])
        if len(embeddings) == len(texts):
            parsed = []
            for item in embeddings:
                values = item.get("values") or item.get("embedding")
                if isinstance(values, list):
                    parsed.append(list(map(float, values)))
            if len(parsed) == len(texts):
                return parsed

    raise RuntimeError(
        f"Formato inesperado de respuesta de Gemini: {type(result).__name__} | preview: {str(result)[:300]}"
    )


def chunks(lst: list, n: int):
    """Divide lista en chunks de tamaño n."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]

# ─── Paso 1: Embeddings de global_attributes ─────────────────────────────────

def generate_attribute_embeddings() -> int:
    """
    Lee todos los global_attributes sin embedding y los genera en batches.
    Retorna el número de atributos procesados.
    """
    with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name FROM global_attributes WHERE embedding IS NULL ORDER BY id"
            )
            rows = cur.fetchall()

    if not rows:
        logger.info("No hay global_attributes sin embedding. Nada que hacer.")
        return 0

    logger.info("Generando embeddings para %d atributos...", len(rows))
    total = 0

    for batch in chunks(rows, BATCH_SIZE):
        ids = [row[0] for row in batch]
        texts = [row[1] for row in batch]

        logger.info("  Procesando batch de %d atributos: %s...", len(texts), texts[:3])

        try:
            raw_embeddings = embed_batch(texts)
            normalized = [normalize(e) for e in raw_embeddings]

            with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
                with conn.cursor() as cur:
                    for attr_id, embedding in zip(ids, normalized):
                        vector_literal = to_vector_literal(embedding)
                        cur.execute(
                            "UPDATE global_attributes SET embedding = %s::vector WHERE id = %s",
                            (vector_literal, attr_id),
                        )
                conn.commit()

            total += len(batch)
            logger.info("  ✓ Batch completado (%d/%d)", total, len(rows))

            # Rate limiting suave entre batches
            if len(rows) > BATCH_SIZE:
                time.sleep(60.0)

        except Exception as e:
            logger.exception("Error en batch de atributos: %s", e)
            raise

    logger.info("✅ Embeddings de atributos generados: %d", total)
    return total


# ─── Paso 2: Embeddings de jobs (summary_embedding) ──────────────────────────

def build_job_text(title: str, description: str, hard_skills: list[str], soft_skills: list[str], values: list[str]) -> str:
    """
    Construye texto compuesto para embedding de job.
    Replica la lógica del job_summary_worker.py.
    """
    parts = [f"{title}."]
    if description:
        # Usar primeras 500 chars de la descripción para no exceder límites
        parts.append(description[:500])
    if hard_skills:
        parts.append(f"Habilidades técnicas requeridas: {', '.join(hard_skills)}.")
    if soft_skills:
        parts.append(f"Habilidades blandas requeridas: {', '.join(soft_skills)}.")
    if values:
        parts.append(f"Valores de la empresa: {', '.join(values)}.")
    return " ".join(parts)


def generate_job_embeddings() -> int:
    """
    Lee todos los jobs sin summary_embedding, obtiene sus atributos,
    construye texto compuesto y genera embeddings.
    Retorna el número de jobs procesados.
    """
    with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            # Obtener jobs sin embedding
            cur.execute(
                """
                SELECT j.id, j.title, j.description
                FROM jobs j
                WHERE j.summary_embedding IS NULL
                  AND j.id < 900000  -- excluir jobs de seed de notificaciones
                ORDER BY j.id
                """
            )
            jobs = cur.fetchall()

            if not jobs:
                logger.info("No hay jobs sin summary_embedding. Nada que hacer.")
                return 0

            job_ids = [row[0] for row in jobs]

            # Obtener atributos de cada job
            cur.execute(
                """
                SELECT ja.job_id, ga.name, ga.type
                FROM job_attributes ja
                JOIN global_attributes ga ON ga.id = ja.attribute_id
                WHERE ja.job_id = ANY(%s)
                ORDER BY ja.job_id, ga.type, ga.name
                """,
                (job_ids,),
            )
            attr_rows = cur.fetchall()

    # Organizar atributos por job
    job_attrs: dict[int, dict[str, list[str]]] = {
        job_id: {"hard_skill": [], "soft_skill": [], "value": []} for job_id in job_ids
    }
    for job_id, name, attr_type in attr_rows:
        if attr_type in job_attrs.get(job_id, {}):
            job_attrs[job_id][attr_type].append(name)

    logger.info("Generando summary embeddings para %d jobs...", len(jobs))
    total = 0

    # Procesar en batches
    for batch in chunks(jobs, BATCH_SIZE):
        batch_ids = []
        texts = []

        for job_id, title, description in batch:
            attrs = job_attrs.get(job_id, {})
            text = build_job_text(
                title=title,
                description=description or "",
                hard_skills=attrs.get("hard_skill", []),
                soft_skills=attrs.get("soft_skill", []),
                values=attrs.get("value", []),
            )
            batch_ids.append(job_id)
            texts.append(text)
            logger.debug("  Job %d: %s (texto: %d chars)", job_id, title, len(text))

        logger.info("  Procesando batch de %d jobs...", len(texts))

        try:
            raw_embeddings = embed_batch(texts)
            normalized = [normalize(e) for e in raw_embeddings]

            with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
                with conn.cursor() as cur:
                    for job_id, embedding in zip(batch_ids, normalized):
                        vector_literal = to_vector_literal(embedding)
                        cur.execute(
                            "UPDATE jobs SET summary_embedding = %s::vector WHERE id = %s",
                            (vector_literal, job_id),
                        )
                conn.commit()

            total += len(batch)
            logger.info("  ✓ Batch de jobs completado (%d/%d)", total, len(jobs))

            if len(jobs) > BATCH_SIZE:
                time.sleep(1.0)

        except Exception as e:
            logger.exception("Error en batch de jobs: %s", e)
            raise

    logger.info("✅ Summary embeddings de jobs generados: %d", total)
    return total


# ─── Paso 3: Verificación final ───────────────────────────────────────────────

def verify() -> None:
    with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM global_attributes WHERE embedding IS NOT NULL")
            attrs_with = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM global_attributes")
            attrs_total = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM jobs WHERE summary_embedding IS NOT NULL AND id < 900000")
            jobs_with = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM jobs WHERE id < 900000")
            jobs_total = cur.fetchone()[0]

    logger.info("─" * 60)
    logger.info("VERIFICACIÓN FINAL:")
    logger.info("  global_attributes con embedding: %d / %d", attrs_with, attrs_total)
    logger.info("  jobs con summary_embedding:       %d / %d", jobs_with, jobs_total)

    if attrs_with < attrs_total:
        logger.warning("⚠️  Hay %d atributos sin embedding!", attrs_total - attrs_with)
    else:
        logger.info("✅ Todos los atributos tienen embedding")

    if jobs_with < jobs_total:
        logger.warning("⚠️  Hay %d jobs sin summary_embedding!", jobs_total - jobs_with)
    else:
        logger.info("✅ Todos los jobs tienen summary_embedding")
    logger.info("─" * 60)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("=" * 60)
    logger.info("GENERADOR DE EMBEDDINGS PARA SEED DE DEMO")
    logger.info("Modelo: %s | Dimensiones: %d | Batch size: %d",
                EMBEDDING_MODEL, OUTPUT_DIMENSIONALITY, BATCH_SIZE)
    logger.info("=" * 60)

    # Paso 1: Atributos
    logger.info("\n📍 PASO 1: Embeddings de global_attributes...")
    attr_count = generate_attribute_embeddings()

    # Paso 2: Jobs
    logger.info("\n📍 PASO 2: Embeddings de jobs...")
    job_count = generate_job_embeddings()

    # Paso 3: Verificación
    logger.info("\n📍 PASO 3: Verificación...")
    verify()

    logger.info("\n🚀 Embeddings generados: %d atributos + %d jobs", attr_count, job_count)
    logger.info("✅ Listo para ejecutar: pnpm trigger:evaluations")


if __name__ == "__main__":
    main()
