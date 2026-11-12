"""CargoSync AI service (FastAPI). Deployed separately on Render."""
import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from . import db
from .agent import AnswerFormatError, ProviderError, run_agent
from .config import settings
from .schemas import AskRequest, AskResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("cargosync.ai")

ALLOWED_ROLES = {"ADMIN", "COORDINATOR"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = [
        name
        for name, value in {
            "GEMINI_API_KEY": settings.gemini_api_key,
            "DATABASE_URL": settings.database_url,
            "AI_SERVICE_API_KEY": settings.service_api_key,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="CargoSync AI Service", version="1.0.0", lifespan=lifespan)


async def authorize(
    x_api_key: str = Header(default=""),
    x_user_role: str = Header(default=""),
) -> None:
    """Next.js authenticates the user (Supabase) and forwards their role.
    This service trusts only callers that hold the shared secret."""
    if not hmac.compare_digest(x_api_key.encode(), settings.service_api_key.encode()):
        raise HTTPException(status_code=401, detail="Invalid API key")
    if x_user_role.upper() not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Only ADMIN and COORDINATOR can use the AI assistant")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/ask", response_model=AskResponse, dependencies=[Depends(authorize)])
async def ask(body: AskRequest) -> AskResponse:
    try:
        return await run_agent(body.question.strip(), body.trip_id)
    except ProviderError as exc:
        log.error("%s", exc)
        raise HTTPException(
            status_code=429 if exc.status == 429 else 502,
            detail="The AI provider is busy or unavailable. Try again shortly.",
        )
    except AnswerFormatError as exc:
        log.error("%s", exc)
        raise HTTPException(status_code=502, detail="The AI returned an unreadable answer. Please try again.")