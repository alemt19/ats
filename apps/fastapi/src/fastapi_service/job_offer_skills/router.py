from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from .schemas import JobOfferSkillsSuggestionRequest, JobOfferSkillsSuggestionResponse
from .service import (
    JobOfferSkillsSuggestionService,
    SuggestionConfigurationError,
    SuggestionGenerationError,
    get_job_offer_skills_suggestion_service,
)

router = APIRouter(prefix="/api/jobs", tags=["job-offer-skills"])


@router.post("/suggest-skills", response_model=JobOfferSkillsSuggestionResponse)
async def suggest_job_offer_skills(
    payload: JobOfferSkillsSuggestionRequest,
    service: Annotated[
        JobOfferSkillsSuggestionService,
        Depends(get_job_offer_skills_suggestion_service),
    ],
) -> JobOfferSkillsSuggestionResponse:
    if not payload.title.strip() or not payload.puesto.strip() or not payload.description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Titulo, puesto y descripcion son obligatorios",
        )

    try:
        return await service.suggest(
            JobOfferSkillsSuggestionRequest(
                title=payload.title.strip(),
                puesto=payload.puesto.strip(),
                description=payload.description.strip(),
            )
        )
    except SuggestionConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
    except SuggestionGenerationError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
