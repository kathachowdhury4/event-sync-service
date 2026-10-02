from typing import Any, Optional

from pydantic import BaseModel, Field


class Conflict(BaseModel):
    field: str
    crm_value: Any = None
    calendar_value: Any = None
    severity: str = "WARNING"


class ValidationIssueResponse(BaseModel):
    source: str
    record_id: str
    field: str
    message: str
    severity: str


class MeetingResponse(BaseModel):
    meeting_id: str

    crm_id: Optional[str] = None
    calendar_id: Optional[str] = None

    match_status: str
    confidence: float = Field(ge=0.0, le=1.0)

    match_reasons: list[str] = Field(
        default_factory=list
    )

    title: Optional[str] = None
    date: Optional[str] = None

    start_time: Optional[str] = None
    end_time: Optional[str] = None

    client_name: Optional[str] = None
    company: Optional[str] = None

    organizer: Optional[str] = None

    attendees: list[str] = Field(
        default_factory=list
    )

    location: Optional[str] = None

    meeting_type: Optional[str] = None

    status: Optional[str] = None

    conflicts: list[Conflict] = Field(
        default_factory=list
    )

    validation_issues: list[ValidationIssueResponse] = Field(
        default_factory=list
    )

    sources: dict[str, Any] = Field(
        default_factory=dict
    )


class ReconciliationSummary(BaseModel):
    total_crm_records: int
    total_calendar_records: int

    matched_records: int

    crm_only_records: int
    calendar_only_records: int

    possible_duplicates: int

    conflicts: int

    validation_issues: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str