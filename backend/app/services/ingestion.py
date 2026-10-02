import json
from pathlib import Path
from typing import Any

from app.models.domain import NormalizedEvent
from app.services.normalization import (
    normalize_name,
    normalize_company,
    normalize_title,
    parse_date,
    parse_time,
)
from app.services.validation import (
    validate_event,
)


def load_json_file(
    path: Path
) -> list[dict[str, Any]]:

    if not path.exists():
        raise FileNotFoundError(
            f"Data file not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):

        if "events" in data:
            return data["events"]

        return [data]

    raise ValueError(
        f"Unsupported JSON structure: {path}"
    )


def get_value(
    record: dict[str, Any],
    *keys: str,
) -> Any:

    for key in keys:

        if key in record:
            return record[key]

    return None


def extract_attendees(
    record: dict[str, Any]
) -> list[str]:

    attendees = get_value(
        record,
        "attendees",
        "participants",
    )

    if not attendees:
        return []

    result = []

    for attendee in attendees:

        if isinstance(
            attendee,
            str
        ):
            result.append(attendee)

        elif isinstance(
            attendee,
            dict
        ):

            email = (
                attendee.get("email")
                or attendee.get("address")
            )

            name = (
                attendee.get("name")
                or attendee.get("displayName")
            )

            if email:
                result.append(email)

            elif name:
                result.append(name)

    return result


def normalize_crm_record(
    record: dict[str, Any]
) -> NormalizedEvent:

    source_id = str(
        get_value(
            record,
            "id",
            "crm_id",
            "event_id",
        )
        or ""
    )

    title = get_value(
        record,
        "title",
        "subject",
        "meeting_title",
        "name",
    )

    date_value = get_value(
        record,
        "date",
        "meeting_date",
        "start_date",
    )

    # IMPORTANT:
    # CRM data uses "meeting_time"
    start_value = get_value(
        record,
        "start_time",
        "meeting_time",
        "time",
        "start",
    )

    end_value = get_value(
        record,
        "end_time",
        "end",
    )

    client_name = get_value(
        record,
        "client_name",
        "contact_name",
        "client",
        "contact",
    )

    company = get_value(
        record,
        "company",
        "client_company",
        "account",
    )

    organizer = get_value(
        record,
        "organizer",
        "owner",
        "sales_owner",
    )

    location = get_value(
        record,
        "location",
        "venue",
    )

    meeting_type = get_value(
        record,
        "meeting_type",
        "type",
    )

    status = get_value(
        record,
        "status",
    )

    description = get_value(
        record,
        "description",
        "notes",
    )

    parsed_date = parse_date(
        str(date_value)
        if date_value is not None
        else None
    )

    parsed_start = parse_time(
        str(start_value)
        if start_value is not None
        else None
    )

    parsed_end = parse_time(
        str(end_value)
        if end_value is not None
        else None
    )

    event = NormalizedEvent(
        source="crm",
        source_id=source_id,
        title=str(title)
        if title is not None
        else None,
        date=parsed_date,
        raw_date=str(date_value)
        if date_value is not None
        else None,
        start_time=parsed_start,
        end_time=parsed_end,
        client_name=normalize_name(
            client_name
        ),
        company=normalize_company(
            company
        ),
        organizer=normalize_name(
            organizer
        ),
        attendees=extract_attendees(
            record
        ),
        location=normalize_title(
            location
        ),
        meeting_type=normalize_title(
            meeting_type
        ),
        status=str(status)
        if status is not None
        else None,
        description=str(description)
        if description is not None
        else None,
        raw=record,
    )

    event.validation_issues = (
        validate_event(event)
    )

    return event


def normalize_calendar_record(
    record: dict[str, Any]
) -> NormalizedEvent:

    source_id = str(
        get_value(
            record,
            "id",
            "calendar_id",
            "event_id",
        )
        or ""
    )

    title = get_value(
        record,
        "title",
        "subject",
        "summary",
    )

    start_value = get_value(
        record,
        "start_time",
        "meeting_time",
        "time",
        "start",
    )

    end_value = get_value(
        record,
        "end",
        "end_time",
    )

    start_dt = parse_date(
        str(start_value)
        if start_value is not None
        else None
    )

    end_dt = parse_date(
        str(end_value)
        if end_value is not None
        else None
    )

    attendees = extract_attendees(
        record
    )

    organizer = get_value(
        record,
        "organizer",
        "owner",
    )

    location = get_value(
        record,
        "location",
        "venue",
    )

    status = get_value(
        record,
        "status",
    )

    description = get_value(
        record,
        "description",
        "notes",
    )

    event = NormalizedEvent(
        source="calendar",
        source_id=source_id,
        title=str(title)
        if title is not None
        else None,
        date=start_dt,
        raw_date=str(start_value)
        if start_value is not None
        else None,
        start_time=start_dt,
        end_time=end_dt,
        organizer=normalize_name(
            organizer
        ),
        attendees=attendees,
        location=normalize_title(
            location
        ),
        status=str(status)
        if status is not None
        else None,
        description=str(description)
        if description is not None
        else None,
        raw=record,
    )

    event.validation_issues = (
        validate_event(event)
    )

    return event


def load_crm_events(
    path: Path
) -> list[NormalizedEvent]:

    records = load_json_file(path)

    return [
        normalize_crm_record(record)
        for record in records
    ]


def load_calendar_events(
    path: Path
) -> list[NormalizedEvent]:

    records = load_json_file(path)

    return [
        normalize_calendar_record(record)
        for record in records
    ]