"""Central configuration. Everything comes from environment variables."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    embed_model: str = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    embed_dim: int = int(os.getenv("EMBED_DIM", "768"))
    database_url: str = os.getenv("DATABASE_URL", "")
    service_api_key: str = os.getenv("AI_SERVICE_API_KEY", "")
    max_tool_steps: int = int(os.getenv("MAX_TOOL_STEPS", "5"))
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "4"))


settings = Settings()