"""RAG with LangChain: Gemini embeddings + a pgvector (Supabase) similarity search."""
import math

from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from .config import settings
from .db import read_conn

# embed_query() uses RETRIEVAL_QUERY and embed_documents() uses RETRIEVAL_DOCUMENT automatically.
embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.embed_model,
    google_api_key=settings.gemini_api_key,
    output_dimensionality=settings.embed_dim,
)


def _normalize(vec: list[float]) -> list[float]:
    # gemini-embedding-001 only returns unit-length vectors at 3072 dims; we use 768.
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


async def embed_documents(texts: list[str]) -> list[list[float]]:
    return [_normalize(v) for v in await embeddings.aembed_documents(texts)]


async def embed_query(text: str) -> list[float]:
    return _normalize(await embeddings.aembed_query(text))


def to_pgvector(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


async def retrieve(question: str, k: int | None = None) -> list[Document]:
    """Top-k most similar knowledge chunks as LangChain Documents."""
    query_vec = await embed_query(question)
    async with read_conn() as c:
        recs = await c.fetch(
            """
            SELECT source, chunk_index, content,
                   1 - (embedding OPERATOR(extensions.<=>) $1::text::extensions.vector) AS similarity
            FROM ai.knowledge_chunks
            ORDER BY embedding OPERATOR(extensions.<=>) $1::text::extensions.vector
            LIMIT $2
            """,
            to_pgvector(query_vec),
            k or settings.rag_top_k,
        )
    return [
        Document(
            page_content=r["content"],
            metadata={"source": r["source"], "chunk_index": r["chunk_index"], "similarity": float(r["similarity"])},
        )
        for r in recs
    ]