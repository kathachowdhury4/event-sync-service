import re
from typing import Any

from app.models.domain import (
    NormalizedEvent,
    ValidationIssue,
)


EMAIL_PATTERN = re.compile(
    r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
)


def validate_event(
    event: NormalizedEvent
) -> list[ValidationIssue]:

    issues: list[ValidationIssue] = []

    if not event.title:
        issues.append(
            ValidationIssue(
                source=event.source,
                record_id=event.source_id,
                field="title",
                message="Missing event title",
            )
        )

    if not event.date:
        issues.append(
            ValidationIssue(
                source=event.source,
                record_id=event.source_id,
                field="date",
                message="Missing or invalid date",
            )
        )

    if not event.start_time:
        issues.append(
            ValidationIssue(
                source=event.source,
                record_id=event.source_id,
                field="start_time",
                message="Missing or invalid start time",
            )
        )

    if event.end_time and event.start_time:

        if event.end_time < event.start_time:

            issues.append(
                ValidationIssue(
                    source=event.source,
                    record_id=event.source_id,
                    field="end_time",
                    message=(
                        "End time occurs before "
                        "start time"
                    ),
                )
            )

    for attendee in event.attendees:

        if "@" in attendee:

            if not EMAIL_PATTERN.match(
                attendee
            ):

                issues.append(
                    ValidationIssue(
                        source=event.source,
                        record_id=event.source_id,
                        field="attendees",
                        message=(
                            f"Malformed email: "
                            f"{attendee}"
                        ),
                    )
                )

    return issues


def validate_raw_record(
    source: str,
    record: dict[str, Any],
    record_id: str,
) -> list[ValidationIssue]:

    issues = []

    if not isinstance(record, dict):

        issues.append(
            ValidationIssue(
                source=source,
                record_id=record_id,
                field="record",
                message="Record is not an object",
                severity="ERROR",
            )
        )

    return issues