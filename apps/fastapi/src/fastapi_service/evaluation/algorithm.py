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


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Cosine similarity between two vectors. Assumes vectors may or may not be normalized."""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


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

    compare_texts_lower = [t.lower() for t in compare_texts]
    compare_vecs = [np.array(e, dtype=np.float64) for e in compare_embeddings]
    effective_mandatory_flags = mandatory_flags or [False] * len(base_texts)

    total_score = 0.0
    details: list[MatchDetail] = []

    for i, req in enumerate(base_texts):
        req_lower = req.lower()

        # Step 1: Exact match
        if req_lower in compare_texts_lower:
            details.append(
                MatchDetail(
                    requirement=req,
                    matched_to=req,
                    score=1.0,
                    match_type="exact",
                )
            )
            total_score += 1.0
            continue

        # Step 2: Semantic match
        req_vec = np.array(base_embeddings[i], dtype=np.float64)
        best_score = -1.0
        best_idx = -1

        for j, cand_vec in enumerate(compare_vecs):
            score = cosine_similarity(req_vec, cand_vec)
            if score > best_score:
                best_score = score
                best_idx = j

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
        mandatory_hits = 0

        for idx in mandatory_indexes:
            req_vec = np.array(base_embeddings[idx], dtype=np.float64)
            best_similarity = max(cosine_similarity(req_vec, cand_vec) for cand_vec in compare_vecs)
            if best_similarity > IS_MANDATORY_RECALL:
                mandatory_hits += 1

        mandatory_score = mandatory_hits / len(mandatory_indexes)
        final_score = (final_score * (1.0 - weight)) + (mandatory_score * weight)

    return MatchResult(final_score=final_score, details=details)
