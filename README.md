<!-- @format -->

# ATS Monorepo

Modern TypeScript monorepo with strict versioning, shared Zod schemas, and
Next.js + NestJS apps orchestrated by Turborepo.

## Structure

```
apps/
	api/              # NestJS API (modular)
	fastapi/          # FastAPI service
	web/              # Next.js app (App Router)
packages/
	eslint-config/    # Shared ESLint configs
	schema/           # Zod schemas + inferred types
	typescript-config/# Shared TS configs
	ui/               # Shared UI components
```

## Quick Start

### Prerequisites

- [pnpm](https://pnpm.io/installation)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (for Python/FastAPI)

To install `uv` quickly via terminal:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Setup

```
pnpm install
pnpm dev
```

Run only FastAPI:

```
pnpm dev --filter fastapi
```

## Scripts

```
pnpm build        # Build all apps and packages
pnpm lint         # Lint all apps and packages
pnpm check-types  # Typecheck all apps and packages
```

## Zod Single Source of Truth

Schemas live in packages/schema and are consumed by both NestJS and Next.js.

Example paths:

- packages/schema/src/auth.ts
- apps/api/src/modules/auth
- apps/web/app/examples/login

## Async CV Parsing (Supabase + Redis)

High-level flow for CV processing:

1. NestJS receives the CV upload, validates it, and stores the file in Supabase
   Storage.
2. NestJS enqueues a job in Redis (BullMQ) with the file reference and metadata.
3. FastAPI consumes the job, downloads the PDF, extracts text, and persists
   results to the database.

Storage conventions:

- Bucket: ats-files
- CVs: cvs/{candidateId}/{timestamp}.pdf
- Company logos: company-logos/{companyId}/{timestamp}.{ext}

Environment (local dev):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- REDIS_URL
