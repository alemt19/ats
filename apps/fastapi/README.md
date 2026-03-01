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

The service listens on port 8000 by default.
