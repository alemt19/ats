from io import BytesIO

from pypdf import PdfReader


def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    chunks: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(text)
    return "\n".join(chunks).strip()
