"""Embed the markdown files in ./knowledge and store them in Supabase pgvector.

Run from the ai-service folder (re-run whenever you edit the knowledge docs):
    python -m scripts.ingest
"""
import asyncio
from pathlib import Path

import asyncpg
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

from app.config import settings
from app.db import clean_dsn
from app.rag import embed_documents, to_pgvector

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"
BATCH = 20

# Splits on markdown headings first, then paragraphs, so each chunk stays on one topic.
splitter = RecursiveCharacterTextSplitter.from_language(
    Language.MARKDOWN, chunk_size=900, chunk_overlap=100
)


def chunk_markdown(text: str) -> list[str]:
    return [c.strip() for c in splitter.split_text(text) if c.strip()]


async def main() -> None:
    if not settings.gemini_api_key or not settings.database_url:
        raise SystemExit("Set GEMINI_API_KEY and DATABASE_URL first (see .env.example)")

    conn = await asyncpg.connect(clean_dsn(settings.database_url), ssl="require", statement_cache_size=0)
    try:
        for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
            chunks = chunk_markdown(path.read_text(encoding="utf-8"))
            vectors: list[list[float]] = []
            for i in range(0, len(chunks), BATCH):
                vectors += await embed_documents(chunks[i : i + BATCH])
                await asyncio.sleep(0.5)  # be gentle with free-tier rate limits

            async with conn.transaction():
                await conn.execute("DELETE FROM ai.knowledge_chunks WHERE source = $1", path.name)
                for idx, (text, vec) in enumerate(zip(chunks, vectors)):
                    await conn.execute(
                        """INSERT INTO ai.knowledge_chunks (source, chunk_index, content, embedding)
                           VALUES ($1, $2, $3, $4::text::extensions.vector)""",
                        path.name, idx, text, to_pgvector(vec),
                    )
            print(f"  {path.name}: {len(chunks)} chunks")
        total = await conn.fetchval("SELECT COUNT(*) FROM ai.knowledge_chunks")
        print(f"Done. {total} chunks in ai.knowledge_chunks")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())