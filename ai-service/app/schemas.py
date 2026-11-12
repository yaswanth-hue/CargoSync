"""Pydantic models: API contract + the structured output Gemini must follow."""
from typing import Literal

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    trip_id: str | None = Field(default=None, max_length=64)


# ---- Structured output (Gemini is forced to return exactly this shape) ----
class Insight(BaseModel):
    title: str = Field(description="Short headline, at most 10 words")
    detail: str = Field(description="1-3 sentences explaining the finding using facts from the evidence")
    severity: Literal["info", "warning", "critical"]
    related_ids: list[str] = Field(
        description="IDs of trips, requests, vehicles or claims this refers to; empty list if none"
    )


class LogisticsAnswer(BaseModel):
    summary: str = Field(description="Direct answer to the question in 2-4 sentences")
    insights: list[Insight] = Field(description="Between 0 and 6 key findings, most important first")
    recommended_actions: list[str] = Field(
        description="Suggestions for the coordinator to consider. Phrase as recommendations, never as done actions"
    )
    data_gaps: list[str] = Field(
        description="Things you could not determine from the data; empty list if none"
    )
    confidence: Literal["low", "medium", "high"]


# ---- What the API returns to Next.js ----
class AskResponse(BaseModel):
    answer: LogisticsAnswer
    tools_used: list[str]            # server-recorded, not model-claimed
    knowledge_sources: list[str]     # server-recorded RAG citations
    advisory_only: bool = True
    model: str