from fastapi import FastAPI

app = FastAPI(title="ATS FastAPI Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
