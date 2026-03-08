import asyncio
import signal
from typing import Any

from bullmq import Worker

from .config import load_supabase_config, load_worker_config
from .cv_parser import extract_text_from_pdf
from .supabase_client import get_supabase_client

QUEUE_NAME = "cv-parse"


def _download_cv(path: str) -> bytes:
    supabase = get_supabase_client()
    config = load_supabase_config()
    return supabase.storage.from_(config.storage_bucket).download(path)


def _update_candidate_cv_text(candidate_id: int, text: str) -> None:
    supabase = get_supabase_client()
    supabase.table("candidates").update({"cv_text": text}).eq("id", candidate_id).execute()


async def process(job: Any, _job_token: str) -> dict[str, str]:
    data = job.data or {}
    candidate_id = int(data.get("candidate_id"))
    storage_path = data.get("storage_path")
    if not storage_path or not candidate_id:
        raise ValueError("candidate_id and storage_path are required")

    pdf_bytes = _download_cv(storage_path)
    text = extract_text_from_pdf(pdf_bytes)
    _update_candidate_cv_text(candidate_id, text)

    return {"status": "ok", "candidate_id": str(candidate_id)}


async def main() -> None:
    worker_config = load_worker_config()

    shutdown_event = asyncio.Event()

    def signal_handler(_signal: int, _frame: object | None) -> None:
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    worker = Worker(QUEUE_NAME, process, {"connection": worker_config.redis_url})

    await shutdown_event.wait()
    await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
