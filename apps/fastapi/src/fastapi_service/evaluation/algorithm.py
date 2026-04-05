"""
Matching algorithm ported from prototipo-tesis/src/utils/embedding.js

Compares base requirements (job) against candidate attributes using:
1. Exact match (case-insensitive) → score 1.0
2. Semantic match via cosine similarity ≥ THRESHOLD → use raw score
3. Below threshold → score 0.0

Final score = average of individual scores across all base items.
"""

import logging
import os
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger("fastapi_service.evaluation.algorithm")

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.65"))
IS_MANDATORY_RECALL = float(os.getenv("IS_MANDATORY_RECALL", str(SIMILARITY_THRESHOLD)))
IS_MANDATORY_WEIGHT = float(os.getenv("IS_MANDATORY_WEIGHT", "0.0"))


@dataclass
class MatchDetail:
    requirement: str
    matched_to: str
    score: float
    match_type: str  # "exact" | "semantic" | "not_found"


@dataclass
class MatchResult:
    final_score: float
    details: list[MatchDetail] = field(default_factory=list)


def analyze_embeddings(
    base_texts: list[str],
    compare_texts: list[str],
    base_embeddings: list[list[float]],
    compare_embeddings: list[list[float]],
    mandatory_flags: list[bool] | None = None,
) -> MatchResult:
    """
    Analyze how well compare items match base requirements.

    Args:
        base_texts: Requirement names (from the job).
        compare_texts: Candidate attribute names.
        base_embeddings: Embedding vectors for each base text.
        compare_embeddings: Embedding vectors for each compare text.
        mandatory_flags: Optional list matching base_texts where True means mandatory.

    Returns:
        MatchResult with final_score and per-requirement details.
    """
    if not base_texts:
        return MatchResult(final_score=0.0)

    if not compare_texts or not compare_embeddings:
        missing_details = [
            MatchDetail(
                requirement=req,
                matched_to="",
                score=0.0,
                match_type="not_found",
            )
            for req in base_texts
        ]
        return MatchResult(final_score=0.0, details=missing_details)

    # O(1) exact match lookup
    compare_texts_lower = [t.lower() for t in compare_texts]
    compare_texts_lower_dict: dict[str, int] = {t: i for i, t in enumerate(compare_texts_lower)}
    effective_mandatory_flags = mandatory_flags or [False] * len(base_texts)

    # Build normalized matrices for vectorized cosine similarity: base [N,D], compare [M,D]
    base_matrix = np.array(base_embeddings, dtype=np.float64)
    compare_matrix = np.array(compare_embeddings, dtype=np.float64)

    base_norms = np.linalg.norm(base_matrix, axis=1, keepdims=True)
    compare_norms = np.linalg.norm(compare_matrix, axis=1, keepdims=True)
    base_matrix_norm = np.where(base_norms > 0, base_matrix / base_norms, base_matrix)
    compare_matrix_norm = np.where(compare_norms > 0, compare_matrix / compare_norms, compare_matrix)

    # All-vs-all cosine similarity in one BLAS call: [N, M]
    similarity_matrix = base_matrix_norm @ compare_matrix_norm.T
    best_scores = np.max(similarity_matrix, axis=1)   # [N] best score per requirement
    best_idxs = np.argmax(similarity_matrix, axis=1)  # [N] index of best match

    total_score = 0.0
    details: list[MatchDetail] = []

    for i, req in enumerate(base_texts):
        req_lower = req.lower()

        # Step 1: Exact match
        if req_lower in compare_texts_lower_dict:
            exact_idx = compare_texts_lower_dict[req_lower]
            details.append(
                MatchDetail(
                    requirement=req,
                    matched_to=compare_texts[exact_idx],
                    score=1.0,
                    match_type="exact",
                )
            )
            total_score += 1.0
            continue

        # Step 2: Semantic match (use precomputed best score/idx)
        best_score = float(best_scores[i])
        best_idx = int(best_idxs[i])

        if best_score >= SIMILARITY_THRESHOLD:
            details.append(
                MatchDetail(
                    requirement=req,
                    matched_to=compare_texts[best_idx],
                    score=best_score,
                    match_type="semantic",
                )
            )
            total_score += best_score
        else:
            details.append(
                MatchDetail(
                    requirement=req,
                    matched_to="",
                    score=0.0,
                    match_type="not_found",
                )
            )

    final_score = total_score / len(base_texts)

    mandatory_indexes = [
        idx
        for idx, is_mandatory in enumerate(effective_mandatory_flags[: len(base_texts)])
        if is_mandatory
    ]
    weight = max(0.0, min(1.0, IS_MANDATORY_WEIGHT))

    if mandatory_indexes and weight > 0.0:
        # Reuse precomputed best_scores — no redundant similarity recomputation
        mandatory_hits = sum(
            1 for idx in mandatory_indexes if float(best_scores[idx]) > IS_MANDATORY_RECALL
        )
        mandatory_score = mandatory_hits / len(mandatory_indexes)
        final_score = (final_score * (1.0 - weight)) + (mandatory_score * weight)

    return MatchResult(final_score=final_score, details=details)
