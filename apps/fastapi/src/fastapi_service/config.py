import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    service_role_key: str
    storage_bucket: str


@dataclass(frozen=True)
class WorkerConfig:
    redis_url: str


def load_supabase_config() -> SupabaseConfig:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "ats-files").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    if not bucket:
        raise RuntimeError("SUPABASE_STORAGE_BUCKET must be set")
    return SupabaseConfig(url=url, service_role_key=key, storage_bucket=bucket)


def load_worker_config() -> WorkerConfig:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
    if not redis_url:
        raise RuntimeError("REDIS_URL must be set")
    return WorkerConfig(redis_url=redis_url)
