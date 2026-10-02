from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class ValidationIssue:
    source: str
    record_id: str
    field: str
    message: str
    severity: str = "WARNING"


@dataclass
class NormalizedEvent:
    source: str
    source_id: str

    title: Optional[str] = None
    date: Optional[datetime] = None
    raw_date: Optional[str] = None

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    client_name: Optional[str] = None
    company: Optional[str] = None
    organizer: Optional[str] = None

    attendees: list[str] = field(default_factory=list)

    location: Optional[str] = None
    meeting_type: Optional[str] = None
    status: Optional[str] = None

    description: Optional[str] = None

    raw: dict[str, Any] = field(default_factory=dict)

    validation_issues: list[ValidationIssue] = field(
        default_factory=list
    )


@dataclass
class MatchResult:
    crm_id: Optional[str]
    calendar_id: Optional[str]

    match_status: str

    confidence: float = 0.0

    reasons: list[str] = field(default_factory=list)

    conflicts: list[dict[str, Any]] = field(
        default_factory=list
    )

    validation_issues: list[dict[str, Any]] = field(
        default_factory=list
    )


@dataclass
class DuplicateResult:
    source: str
    record_id: str
    duplicate_of: str

    confidence: float

    reasons: list[str] = field(
        default_factory=list
    )