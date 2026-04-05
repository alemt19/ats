# Seed Completo para Demo de Defensa de Tesis

## Overview

El seed genera un ambiente de demo completamente funcional con datos realistas para mostrar todas las features del ATS en la defensa de tesis.

**Datos generados:**
- 1 empresa (InnovateTech C.A.) con configuración cultural
- 3 reclutadores (1 head_of_recruiters + 2 recruiters)
- 8 categorías laborales
- 50 global attributes (20 hard skills, 20 soft skills, 10 valores)
- 15 ofertas laborales (10 published, 3 closed, 2 draft)
- 15 candidatos con perfiles diversos (cv_text, cultural prefs, behavioral answers)
- ~33 postulaciones listas para evaluación AI

## Flujo de Ejecución

### Paso 1: Datos Estructurales
```bash
pnpm seed
```
Ejecuta `apps/api/prisma/seed.ts` — inserta toda la data base en la BD sin embeddings.

**Tiempo:** ~5-10 segundos

### Paso 2: Generar Embeddings
```bash
pnpm seed:embeddings
```
Ejecuta `apps/fastapi/scripts/generate-seed-embeddings.py` — genera embeddings para:
- 50 global_attributes (hard skills, soft skills, valores)
- 15 jobs (summary_embedding)

Usa Gemini API en batches de 50.

**Requisitos:**
- `GEMINI_API_KEY` en `.env`
- `DATABASE_URL` en `.env`

**Tiempo:** ~2-3 minutos (depende de la API de Gemini)

### Paso 3: Encolador de Evaluaciones
```bash
pnpm seed:trigger
```
Ejecuta `apps/api/scripts/trigger-evaluations.ts` — encola todas las aplicaciones `pending` en BullMQ.

**Requisitos:**
- Redis corriendo (REDIS_URL en `.env`, por defecto localhost:6379)
- Workers FastAPI activos

**Tiempo:** ~5 segundos

### Paso 4: Procesar Evaluaciones
```bash
pnpm dev
```
En otra terminal, inicia los workers FastAPI que procesan las evaluaciones:
```bash
# Esta línea ya está en turbo.json como parte de "dev"
cd apps/fastapi && uv run python -m fastapi_service.main
```

**Tiempo:** 20-30 minutos (ejecución en background, depende de Gemini API para generación de feedback)

---

## Flujo Completo (One-liner)

```bash
# Terminal 1: Preparar datos
pnpm seed && pnpm seed:embeddings

# Terminal 2 (mientras se completa): Iniciar workers
docker-compose up -d  # Redis
pnpm dev

# Terminal 1 (cuando embeddings terminen): Encolador
pnpm seed:trigger

# Esperar ~20-30 min hasta que evaluaciones se completen
```

## Credenciales de Acceso

**Admins:**
- Email: `sofia.hernandez@innovatetech.com` / Contraseña: `demo1234#` (head_of_recruiters)
- Email: `miguel.torres@innovatetech.com` / Contraseña: `demo1234#` (recruiter)

**Candidatos (para live demo):**
- Email: `ana.garcia@email.com` / Contraseña: `demo1234#` (Senior Frontend)
- Email: `sebastian.morales@email.com` / Contraseña: `demo1234#` (Junior Frontend - más interesante para aplicación en vivo)
- Email: `carlos.perez@email.com` / Contraseña: `demo1234#` (Data Analyst)

## Verificación

Después del Step 2 (embeddings), verifica que se hayan generado correctamente:

```sql
-- En Supabase o psql
SELECT 
  'global_attributes con embedding' as metric,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as count,
  COUNT(*) as total
FROM global_attributes
UNION ALL
SELECT 
  'jobs con summary_embedding',
  COUNT(*) FILTER (WHERE summary_embedding IS NOT NULL),
  COUNT(*)
FROM jobs WHERE id < 900000;
```

Deberías ver:
- 50/50 atributos con embedding ✅
- 15/15 jobs con embedding ✅

Después del Step 4 (evaluaciones), verifica:

```sql
SELECT evaluation_status, COUNT(*) FROM applications GROUP BY evaluation_status;
```

Deberías ver:
- ~30 evaluaciones completadas (completed)
- ~3-4 evaluaciones pendientes (pending) — para demo en vivo

## Architecture

### seed.ts
- Usa `PrismaPg` adapter para conexión directa a PostgreSQL
- Crea users via BetterAuth con email scoped (`+ats-admin` suffix para admins)
- Genera 15 candidatos con cv_text realista en español
- Todos los usuarios con contraseña `demo1234#`

### generate-seed-embeddings.py
- Lee `global_attributes` y `jobs` sin embeddings
- Llama `client.models.embed_content()` de Google Gemini en batches
- **Importante:** Usa SQL raw con psycopg3 porque `embedding` es `Unsupported("vector")` en Prisma
- Normaliza embeddings a longitud unitaria (L2 norm) para cosine similarity
- Muestra progreso por batch

### trigger-evaluations.ts
- Verifica que haya embeddings antes de encolar
- Busca `applications WHERE evaluation_status = 'pending'`
- Encola en BullMQ con reintentos (3 attempts, exponential backoff)
- Imprime resumen de aplicaciones encoladas

## Troubleshooting

### Error: "DATABASE_URL no está definida"
**Solución:** Asegúrate de que `.env` en `apps/api/` tiene `DATABASE_URL` configurada (Supabase).

### Error: "GEMINI_API_KEY no está definida"
**Solución:** Agrega `GEMINI_API_KEY` a `apps/api/.env` o `apps/fastapi/.env`.

### Embeddings toman mucho tiempo
**Normal:** Gemini API puede tardar 1-2 min por batch. El timeout es de 5 min por batch.

### Las evaluaciones no se procesan
**Verificar:**
1. Redis está corriendo: `redis-cli ping` → debe retornar `PONG`
2. Workers están activos: Check logs en `pnpm dev`
3. Embeddings existen: Query SQL anterior

### Algunos atributos tienen embedding NULL
**Causa:** El script falló en ese batch.
**Solución:** Re-ejecutar `pnpm seed:embeddings` — idempotente, solo actualiza NULLs.

## Notas Técnicas

- **pgvector:** Los campos `embedding` y `summary_embedding` son tipo `vector` de PostgreSQL, no soportados nativamente en Prisma → se usan con SQL raw
- **cv_text:** Se inserta directamente en el seed (no requiere upload a Supabase Storage)
- **evaluation_status:** Inicia en `pending`, workers cambian a `processing` → `completed`
- **Idempotencia:** Todos los scripts son idempotentes — se pueden re-ejecutar sin problemas

## Para la Defensa

**Checklist:**

- [ ] Paso 1: `pnpm seed` completado
- [ ] Paso 2: `pnpm seed:embeddings` completado (verificar SQL query)
- [ ] Paso 3: `pnpm dev` corriendo (workers activos)
- [ ] Paso 4: `pnpm seed:trigger` completado
- [ ] Esperar 20-30 min para evaluaciones
- [ ] Verificar SQL query de completion
- [ ] Acceder a http://localhost:3000/admin con credencial de admin
- [ ] Demo lista: ver dashboard con métricas, ofertas, candidatos, scores

**Demo sugerida:**

1. **Perspectiva Reclutador:**
   - Dashboard → métricas + funnel
   - Lista de ofertas → ver candidatos rankeados por score
   - Candidato específico → scores técnico/soft/cultural + feedback AI + similar jobs

2. **Perspectiva Candidato:**
   - Ver ofertas públicas con filtros
   - Aplicar a una oferta EN VIVO (usar cuenta de Sebastian Morales)
   - Mostrar estado "procesando"
   - (Después de ~20 min) Ver score + feedback + similar jobs

---

**Creado:** Abril 2026 | **Última actualización:** 2026-04-04
