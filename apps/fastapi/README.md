<!-- @format -->

# FastAPI service

## Local dev

### Prerequisites

You need `uv` installed. If you don't have it:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Setup

- Install dependencies: `uv sync`
- Start server: `pnpm dev --filter fastapi`
- Copy env file: `cp .env.example .env`

### Embeddings worker

- Start worker: `pnpm --filter fastapi worker:embeddings`
- Worker logs are printed to stdout (batch received, Gemini call, DB update, errors)
- Required env vars:
  - `REDIS_URL` (e.g. `redis://localhost:6379`)
  - `DATABASE_URL` (PostgreSQL used by ATS; for Supabase use the direct Postgres connection string)
  - `GEMINI_API_KEY`
  - `GEMINI_LLM_API_KEY`
  - `GEMINI_LLM_MODEL`
- Optional env vars:
  - `GEMINI_EMBEDDING_MODEL` (default: `models/embedding-001`)
  - `EMBEDDING_TASK_TYPE` (default: `SEMANTIC_SIMILARITY`)
  - `EMBEDDING_OUTPUT_DIMENSIONALITY` (default: `1536`)
  - `EMBEDDING_BATCH_SIZE` (default: `50`)
  - `EMBEDDING_BATCH_WAIT_SECONDS` (default: `2.0`)
  - `EMBEDDING_WORKER_CONCURRENCY` (default: `50`)

The worker updates embeddings directly in the `global_attributes.embedding` column using `DATABASE_URL`
(Supabase Postgres connection), not via Supabase HTTP APIs.

The service listens on port 8000 by default.

## Company values suggestions endpoint

- Endpoint: `POST /api/company-values/suggest`
- Body:
  - `name: string`
  - `description: string`
  - `mision: string`
- Response:
  - `values: string[]`
