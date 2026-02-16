<!-- @format -->

# ATS Monorepo

Modern TypeScript monorepo with strict versioning, shared Zod schemas, and
Next.js + NestJS apps orchestrated by Turborepo.

## Structure

```
apps/
	api/              # NestJS API (modular)
	web/              # Next.js app (App Router)
packages/
	eslint-config/    # Shared ESLint configs
	schema/           # Zod schemas + inferred types
	typescript-config/# Shared TS configs
	ui/               # Shared UI components
```

## Quick Start

```
pnpm install
pnpm dev
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
