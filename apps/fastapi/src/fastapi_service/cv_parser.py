from io import BytesIO
from urllib.parse import urlparse

from docx import Document
from pypdf import PdfReader


def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    chunks: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(text)
    return "\n".join(chunks).strip()


def extract_text_from_docx(data: bytes) -> str:
    document = Document(BytesIO(data))
    chunks = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(chunks).strip()


def resolve_cv_format(*, filename: str | None = None, content_type: str | None = None) -> str:
    normalized_content_type = (content_type or "").strip().lower()
    if normalized_content_type == "application/pdf":
        return "pdf"

    if (
        normalized_content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        return "docx"

    raw_name = (filename or "").strip()
    parsed_name = urlparse(raw_name).path if "://" in raw_name else raw_name
    normalized_name = parsed_name.lower()
    if normalized_name.endswith(".pdf"):
        return "pdf"
    if normalized_name.endswith(".docx"):
        return "docx"

    raise ValueError("Unsupported CV file format")


def extract_text_from_cv(
    data: bytes,
    *,
    filename: str | None = None,
    content_type: str | None = None,
) -> str:
    cv_format = resolve_cv_format(filename=filename, content_type=content_type)
    if cv_format == "pdf":
        return extract_text_from_pdf(data)

    return extract_text_from_docx(data)
