from fastapi import FastAPI

from fastapi_service.candidate_profile.router import router as candidate_profile_router
from fastapi_service.company_values.router import router as company_values_router
from fastapi_service.environment import load_environment
from fastapi_service.job_offer_skills.router import router as job_offer_skills_router

load_environment()

app = FastAPI(title="ATS FastAPI Service")
app.include_router(company_values_router)
app.include_router(candidate_profile_router)
app.include_router(job_offer_skills_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
