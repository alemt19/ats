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
    # Convierte los textos del candidato a minusculas 
    compare_texts_lower = [t.lower() for t in compare_texts]

    # Crea un diccionario donde las claves son los textos del candidato y los valores son sus indices correspondientes 
    compare_texts_lower_dict: dict[str, int] = {t: i for i, t in enumerate(compare_texts_lower)}

    # Si no se proporcionan las banderas de obligatoriedad, se asume que ninguna es obligatoria.
    effective_mandatory_flags = mandatory_flags or ([False] * len(base_texts))

    # Build normalized matrices for vectorized cosine similarity: base [N,D], compare [M,D]
    # Convierte la lista de embeddings de base en una matriz de numpy de N x M donde n es la cantidad  de embeddings y m es la dimension de cada embedding. Es decir cada fila de la matriz es un embedding. Lo mismo para compare_embeddings.
    base_matrix = np.array(base_embeddings, dtype=np.float64)
    compare_matrix = np.array(compare_embeddings, dtype=np.float64)

    # Devuelve un vector columna con la norma de cada fila (embedding) de la matriz base y compare respectivamente. La matriz resultanda es de N x 1 .La norma se calcula como la raiz cuadrada de la suma de los cuadrados de los elementos del embedding.
    base_norms = np.linalg.norm(base_matrix, axis=1, keepdims=True)
    compare_norms = np.linalg.norm(compare_matrix, axis=1, keepdims=True)

    # Normaliza cada embedding de la matriz original dividiendo por su norma, evitando división por cero. El resultado es una matriz de N x M donde N es la cantidad de embeddings y M es la dimension de cada embedding. Lo mismo para compare matrix_norm
    base_matrix_norm = np.where(base_norms > 0, base_matrix / base_norms, base_matrix)
    compare_matrix_norm = np.where(compare_norms > 0, compare_matrix / compare_norms, compare_matrix)

    # All-vs-all cosine similarity in one BLAS call: [N, M]
    # Calcula la multiplicacion de matrices entre la matriz normalizada de base y la transpuesta de la matriz normalizada de compare (ahora los embeddings son columnas). Por lo cual al multiplicar cada fila de la matriz base con cada columna de la matriz compare se hace la multiplicacion punto entre los embeddings de la oferta y los embeddings del candidato, y como ambos estan normalizados, el resultado es la similitud coseno entre cada requerimiento y cada atributo del candidato. El resultado es una matriz de N x M donde N es la cantidad de requerimientos y M es la cantidad de atributos del candidato. Cada elemento [i,j] representa la similitud entre el requerimiento i y el atributo j.
    similarity_matrix = base_matrix_norm @ compare_matrix_norm.T

    # Para cada requerimiento (fila), encuentra la similitud máxima entre todas las columnas (atributos del candidato) en esa fila. Esto da el mejor puntaje de similitud para cada requerimiento. Luego retorna un vector fila de tamaño N donde cada elemento es el puntaje de similitud más alto para ese requerimiento. Lo mismo para best_idxs pero retorna el indice del atributo del candidato que tiene la similitud más alta para cada requerimiento.
    best_scores = np.max(similarity_matrix, axis=1)   # [N] best score per requirement
    best_idxs = np.argmax(similarity_matrix, axis=1)  # [N] index of best match

    total_score = 0.0
    details: list[MatchDetail] = []

    for i, req in enumerate(base_texts):
        req_lower = req.lower()

        # Step 1: Exact match
        # Si el requerimiento existe en el diccionario de textos del candidato, entonces se considera una coincidencia exacta y se asigna un puntaje de 1.0 para ese requerimiento
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
        best_score = float(best_scores[i]) # La similitud coseno más alta para el requerimiento i
        best_idx = int(best_idxs[i]) # El índice del atributo del candidato que tiene la similitud coseno más alta para el requerimiento i

        # Si el mejor puntaje de similitud coseno es mayor o igual al umbral definido, se considera una coincidencia semántica 
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
            # Step 3: No match
            # Si el mejor puntaje de similitud coseno es menor que el umbral, se considera que no hay coincidencia y se asigna un puntaje de 0.0 para ese requerimiento
            details.append(
                MatchDetail(
                    requirement=req,
                    matched_to="",
                    score=0.0,
                    match_type="not_found",
                )
            )

    # El puntaje final es el promedio de los puntajes individuales de cada requerimiento
    final_score = total_score / len(base_texts)

    # mandatory_indexes contiene los indices de los requerimientos que son obligatorios segun las banderas de obligatoriedad. 
    mandatory_indexes = [
        idx
        for idx, is_mandatory in enumerate(effective_mandatory_flags[: len(base_texts)])
        if is_mandatory
    ]
    weight = max(0.0, min(1.0, IS_MANDATORY_WEIGHT)) # Saca el peso definido para la obligatoriedad, asegurándose de que esté entre 0.0 y 1.0

    if mandatory_indexes and weight > 0.0:
        # Reuse precomputed best_scores — no redundant similarity recomputation
        # Suma 1 por cada requerimiento obligatorio que tenga un puntaje de similitud coseno mayor al umbral definido. 
        mandatory_hits = sum(
            1 for idx in mandatory_indexes if float(best_scores[idx]) > IS_MANDATORY_RECALL
        )
        mandatory_score = mandatory_hits / len(mandatory_indexes) # El puntaje de obligatoriedad es la proporción de requerimientos obligatorios que tuvieron una similitud coseno mayor al umbral definido.
        final_score = (final_score * (1.0 - weight)) + (mandatory_score * weight) # El puntaje final se ajusta para incluir el puntaje de obligatoriedad según el peso definido.

    return MatchResult(final_score=final_score, details=details)
