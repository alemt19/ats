from fastapi import FastAPI

from fastapi_service.company_values.router import router as company_values_router
from fastapi_service.environment import load_environment

load_environment()

app = FastAPI(title="ATS FastAPI Service")
app.include_router(company_values_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
