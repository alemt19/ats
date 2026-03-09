"""
Matching algorithm ported from prototipo-tesis/src/utils/embedding.js

Compares base requirements (job) against candidate attributes using:
1. Exact match (case-insensitive) → score 1.0
2. Semantic match via cosine similarity ≥ THRESHOLD → use raw score
3. Below threshold → score 0.0

Final score = average of individual scores across all base items.
"""

import logging
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger("fastapi_service.evaluation.algorithm")

SIMILARITY_THRESHOLD = 0.65


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
) -> MatchResult:
    """
    Analyze how well compare items match base requirements.

    Args:
        base_texts: Requirement names (from the job).
        compare_texts: Candidate attribute names.
        base_embeddings: Embedding vectors for each base text.
        compare_embeddings: Embedding vectors for each compare text.

    Returns:
        MatchResult with final_score and per-requirement details.
    """
    if not base_texts:
        return MatchResult(final_score=0.0)

    if not compare_texts or not compare_embeddings:
        details = [
            MatchDetail(
                requirement=req,
                matched_to="",
                score=0.0,
                match_type="not_found",
            )
            for req in base_texts
        ]
        return MatchResult(final_score=0.0, details=details)

    compare_texts_lower = [t.lower() for t in compare_texts]
    compare_vecs = [np.array(e, dtype=np.float64) for e in compare_embeddings]

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
    return MatchResult(final_score=final_score, details=details)
