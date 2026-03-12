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
    cv_filename: str | None = None
    cv_content_type: str | None = None
    if cv is not None:
        content_type = (cv.content_type or "").lower()
        allowed_content_types = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        if content_type and content_type not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permite CV en PDF o DOCX para sugerencias",
            )

        filename = (cv.filename or "").lower()
        if filename and not (filename.endswith(".pdf") or filename.endswith(".docx")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permite CV en PDF o DOCX para sugerencias",
            )

        cv_filename = cv.filename
        cv_content_type = cv.content_type
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
            cv_file_name=cv_filename,
            cv_file_content_type=cv_content_type,
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
