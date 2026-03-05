from pathlib import Path

from dotenv import load_dotenv


def load_environment() -> None:
    cwd_env = Path.cwd() / ".env"
    app_env = Path(__file__).resolve().parents[2] / ".env"

    if cwd_env.exists():
        load_dotenv(cwd_env)

    if app_env.exists() and app_env != cwd_env:
        load_dotenv(app_env, override=False)
