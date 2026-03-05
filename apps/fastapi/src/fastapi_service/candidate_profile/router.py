from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from .schemas import CandidateProfileSuggestionResponse
from .service import (
    CandidateProfileSuggestionService,
    SuggestionConfigurationError,
    SuggestionGenerationError,
    get_candidate_profile_suggestion_service,
)

router = APIRouter(prefix="/api/candidates", tags=["candidate-profile"])


@router.post(
    "/suggest-skills-values",
    response_model=CandidateProfileSuggestionResponse,
)
async def suggest_skills_values(
    user_id: Annotated[str, Form(...)],
    behavioral_question_1: Annotated[str, Form(...)],
    behavioral_question_2: Annotated[str, Form(...)],
    behavioral_ans_1: Annotated[str, Form(...)],
    behavioral_ans_2: Annotated[str, Form(...)],
    service: Annotated[
        CandidateProfileSuggestionService,
        Depends(get_candidate_profile_suggestion_service),
    ],
    cv_existing_url: Annotated[str | None, Form()] = None,
    cv: Annotated[UploadFile | None, File()] = None,
) -> CandidateProfileSuggestionResponse:
    if not user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id es obligatorio",
        )

    if not behavioral_ans_1.strip() or not behavioral_ans_2.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las respuestas conductuales son obligatorias",
        )

    cv_content: bytes | None = None
    if cv is not None:
        content_type = (cv.content_type or "").lower()
        if content_type and content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permite CV en PDF para sugerencias",
            )

        filename = (cv.filename or "").lower()
        if filename and not filename.endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permite CV en PDF para sugerencias",
            )

        cv_content = await cv.read()

    if cv_content is None and not (cv_existing_url and cv_existing_url.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar un CV en archivo o una URL existente",
        )

    try:
        return await service.suggest(
            user_id=user_id.strip(),
            behavioral_question_1=behavioral_question_1.strip(),
            behavioral_question_2=behavioral_question_2.strip(),
            behavioral_ans_1=behavioral_ans_1.strip(),
            behavioral_ans_2=behavioral_ans_2.strip(),
            cv_file_content=cv_content,
            cv_existing_url=cv_existing_url.strip() if cv_existing_url else None,
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
