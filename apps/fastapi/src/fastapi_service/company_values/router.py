from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from .schemas import CompanyValuesSuggestionRequest, CompanyValuesSuggestionResponse
from .service import (
    CompanyValuesSuggestionService,
    LlmConfigurationError,
    LlmGenerationError,
    get_company_values_suggestion_service,
)

router = APIRouter(prefix="/api/company-values", tags=["company-values"])


def get_company_values_service() -> CompanyValuesSuggestionService:
    try:
        return get_company_values_suggestion_service()
    except LlmConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.post("/suggest", response_model=CompanyValuesSuggestionResponse)
async def suggest_company_values(
    payload: CompanyValuesSuggestionRequest,
    service: Annotated[
        CompanyValuesSuggestionService,
        Depends(get_company_values_service),
    ],
) -> CompanyValuesSuggestionResponse:
    try:
        return await service.suggest_values(payload)
    except LlmGenerationError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
