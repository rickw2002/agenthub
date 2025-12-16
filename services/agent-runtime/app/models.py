from typing import List

from pydantic import BaseModel


class AgentRunInput(BaseModel):
    workspaceId: str
    userId: str
    agentId: str
    message: str
    runId: str | None = None
    organizationId: str
    projectId: str | None = None
    useGlobalLibrary: bool = True


class Citation(BaseModel):
    docId: str
    chunkId: str
    page: int


class AnswerSource(BaseModel):
    text: str
    citations: List[Citation]


class AdditionalReasoningItem(BaseModel):
    text: str
    label: str


class AgentRunOutput(BaseModel):
    reply: str
    answer_from_sources: List[AnswerSource]
    additional_reasoning: List[AdditionalReasoningItem]
    missing_info_questions: List[str]



