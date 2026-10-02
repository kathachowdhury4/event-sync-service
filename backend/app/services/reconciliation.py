from typing import Optional

from app.models.domain import (
    DuplicateResult,
    MatchResult,
    NormalizedEvent,
)

from app.services.normalization import (
    normalize_company,
    normalize_name,
    normalize_title,
    time_to_minutes,
    token_similarity,
)


# ============================================================
# MATCHING HELPERS
# ============================================================

def same_date(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> bool:
    if not first.date or not second.date:
        return False

    return first.date.date() == second.date.date()


def time_difference_minutes(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> Optional[int]:
    first_minutes = time_to_minutes(first.start_time)
    second_minutes = time_to_minutes(second.start_time)

    if first_minutes is None or second_minutes is None:
        return None

    return abs(first_minutes - second_minutes)


def company_match(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> bool:
    first_company = normalize_company(first.company)
    second_company = normalize_company(second.company)

    if not first_company or not second_company:
        return False

    return (
        first_company == second_company
        or first_company in second_company
        or second_company in first_company
    )


def person_match(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> bool:
    first_name = normalize_name(first.client_name)
    second_name = normalize_name(second.client_name)

    if first_name and second_name:
        if first_name == second_name:
            return True

    first_tokens: set[str] = set()
    second_tokens: set[str] = set()

    for attendee in first.attendees:
        name = normalize_name(attendee)
        if name:
            first_tokens.update(name.split())

    for attendee in second.attendees:
        name = normalize_name(attendee)
        if name:
            second_tokens.update(name.split())

    return bool(
        first_tokens
        and second_tokens
        and first_tokens & second_tokens
    )


def title_match_score(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> float:
    first_title = normalize_title(first.title)
    second_title = normalize_title(second.title)

    if not first_title or not second_title:
        return 0.0

    if first_title == second_title:
        return 1.0

    return token_similarity(first_title, second_title)


def location_match(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> bool:
    first_location = normalize_name(first.location)
    second_location = normalize_name(second.location)

    if not first_location or not second_location:
        return False

    if first_location == second_location:
        return True

    return (
        first_location in second_location
        or second_location in first_location
    )


# ============================================================
# MATCH SCORING
# ============================================================

def score_candidate(
    first: NormalizedEvent,
    second: NormalizedEvent,
) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if same_date(first, second):
        score += 0.30
        reasons.append("same calendar date")

    difference = time_difference_minutes(first, second)

    if difference is not None:
        if difference == 0:
            score += 0.30
            reasons.append("exact start time")
        elif difference <= 15:
            score += 0.25
            reasons.append("start time within 15 minutes")
        elif difference <= 30:
            score += 0.15
            reasons.append("start time within 30 minutes")

    if company_match(first, second):
        score += 0.20
        reasons.append("same company/client")

    if person_match(first, second):
        score += 0.10
        reasons.append("same client/person")

    title_score = title_match_score(first, second)

    if title_score >= 1.0:
        score += 0.20
        reasons.append("exact meeting title")
    elif title_score >= 0.50:
        score += 0.15
        reasons.append("similar meeting title")
    elif title_score >= 0.25:
        score += 0.05
        reasons.append("partially similar meeting title")

    if location_match(first, second):
        score += 0.10
        reasons.append("similar location")

    return min(score, 1.0), reasons


# ============================================================
# FIND BEST CALENDAR MATCH
# ============================================================

def find_best_calendar_match(
    crm_event: NormalizedEvent,
    calendar_events: list[NormalizedEvent],
    used_calendar_ids: set[str],
) -> Optional[MatchResult]:

    candidates: list[MatchResult] = []

    for calendar_event in calendar_events:

        if calendar_event.source_id in used_calendar_ids:
            continue

        score, reasons = score_candidate(
            crm_event,
            calendar_event,
        )

        if score >= 0.60:
            candidates.append(
                MatchResult(
                    crm_id=crm_event.source_id,
                    calendar_id=calendar_event.source_id,
                    match_status="MATCHED",
                    confidence=score,
                    reasons=reasons,
                )
            )

    if not candidates:
        return None

    candidates.sort(
        key=lambda item: item.confidence,
        reverse=True,
    )

    return candidates[0]


# ============================================================
# CONFLICT DETECTION
# ============================================================

def build_conflicts(
    crm_event: NormalizedEvent,
    calendar_event: NormalizedEvent,
) -> list[dict]:
    conflicts: list[dict] = []

    # --------------------------------------------------------
    # TITLE
    # --------------------------------------------------------

    if (
        crm_event.title
        and calendar_event.title
        and normalize_title(crm_event.title)
        != normalize_title(calendar_event.title)
    ):
        conflicts.append(
            {
                "field": "title",
                "crm_value": crm_event.title,
                "calendar_value": calendar_event.title,
                "severity": "INFO",
            }
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if (
        crm_event.status
        and calendar_event.status
        and crm_event.status.lower()
        != calendar_event.status.lower()
    ):
        conflicts.append(
            {
                "field": "status",
                "crm_value": crm_event.status,
                "calendar_value": calendar_event.status,
                "severity": "WARNING",
            }
        )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    if (
        crm_event.location
        and calendar_event.location
        and not location_match(
            crm_event,
            calendar_event,
        )
    ):
        conflicts.append(
            {
                "field": "location",
                "crm_value": crm_event.location,
                "calendar_value": calendar_event.location,
                "severity": "WARNING",
            }
        )

    # --------------------------------------------------------
    # START TIME
    # --------------------------------------------------------

    crm_minutes = time_to_minutes(
        crm_event.start_time
    )

    calendar_minutes = time_to_minutes(
        calendar_event.start_time
    )

    if (
        crm_minutes is not None
        and calendar_minutes is not None
        and crm_minutes != calendar_minutes
    ):
        conflicts.append(
            {
                "field": "start_time",
                "crm_value": (
                    crm_event.start_time.isoformat()
                    if crm_event.start_time
                    else None
                ),
                "calendar_value": (
                    calendar_event.start_time.isoformat()
                    if calendar_event.start_time
                    else None
                ),
                "severity": "WARNING",
            }
        )

    # --------------------------------------------------------
    # DATE
    # --------------------------------------------------------

    if (
        crm_event.date
        and calendar_event.date
        and crm_event.date.date()
        != calendar_event.date.date()
    ):
        conflicts.append(
            {
                "field": "date",
                "crm_value": crm_event.date.isoformat(),
                "calendar_value": calendar_event.date.isoformat(),
                "severity": "WARNING",
            }
        )

    return conflicts


# ============================================================
# RECONCILIATION
# ============================================================

def reconcile(
    crm_events: list[NormalizedEvent],
    calendar_events: list[NormalizedEvent],
) -> list[dict]:

    results: list[dict] = []

    used_calendar_ids: set[str] = set()

    # --------------------------------------------------------
    # CRM EVENTS
    # --------------------------------------------------------

    for crm_event in crm_events:

        match = find_best_calendar_match(
            crm_event,
            calendar_events,
            used_calendar_ids,
        )

        if match:

            calendar_event = next(
                (
                    event
                    for event in calendar_events
                    if event.source_id == match.calendar_id
                ),
                None,
            )

            if calendar_event is None:
                continue

            used_calendar_ids.add(
                calendar_event.source_id
            )

            conflicts = build_conflicts(
                crm_event,
                calendar_event,
            )

            results.append(
                {
                    "meeting_id": (
                        f"{crm_event.source_id}-"
                        f"{calendar_event.source_id}"
                    ),

                    "crm_id": crm_event.source_id,

                    "calendar_id": (
                        calendar_event.source_id
                    ),

                    "match_status": "MATCHED",

                    "confidence": round(
                        match.confidence,
                        2,
                    ),

                    "match_reasons": match.reasons,

                    "title": (
                        crm_event.title
                        or calendar_event.title
                    ),

                    "date": (
                        crm_event.date
                        or calendar_event.date
                    ),

                    "start_time": (
                        crm_event.start_time
                        or calendar_event.start_time
                    ),

                    "end_time": (
                        calendar_event.end_time
                        or crm_event.end_time
                    ),

                    "client_name": (
                        crm_event.client_name
                        or calendar_event.client_name
                    ),

                    "company": (
                        crm_event.company
                        or calendar_event.company
                    ),

                    "organizer": (
                        calendar_event.organizer
                        or crm_event.organizer
                    ),

                    "attendees": list(
                        dict.fromkeys(
                            crm_event.attendees
                            + calendar_event.attendees
                        )
                    ),

                    "location": (
                        crm_event.location
                        or calendar_event.location
                    ),

                    "meeting_type": (
                        crm_event.meeting_type
                        or calendar_event.meeting_type
                    ),

                    "status": (
                        crm_event.status
                        or calendar_event.status
                    ),

                    "conflicts": conflicts,

                    "validation_issues": (
                        crm_event.validation_issues
                        + calendar_event.validation_issues
                    ),

                    "sources": {
                        "crm": crm_event.raw,
                        "calendar": calendar_event.raw,
                    },
                }
            )

        else:

            # ------------------------------------------------
            # CRM ONLY
            # ------------------------------------------------

            results.append(
                {
                    "meeting_id": crm_event.source_id,

                    "crm_id": crm_event.source_id,

                    "calendar_id": None,

                    "match_status": "CRM_ONLY",

                    "confidence": 0.0,

                    "match_reasons": [],

                    "title": crm_event.title,

                    "date": crm_event.date,

                    "start_time": crm_event.start_time,

                    "end_time": crm_event.end_time,

                    "client_name": crm_event.client_name,

                    "company": crm_event.company,

                    "organizer": crm_event.organizer,

                    "attendees": crm_event.attendees,

                    "location": crm_event.location,

                    "meeting_type": crm_event.meeting_type,

                    "status": crm_event.status,

                    "conflicts": [],

                    "validation_issues": (
                        crm_event.validation_issues
                    ),

                    "sources": {
                        "crm": crm_event.raw,
                        "calendar": None,
                    },
                }
            )

    # --------------------------------------------------------
    # CALENDAR EVENTS THAT WERE NOT MATCHED
    # --------------------------------------------------------

    for calendar_event in calendar_events:

        if calendar_event.source_id in used_calendar_ids:
            continue

        results.append(
            {
                "meeting_id": calendar_event.source_id,

                "crm_id": None,

                "calendar_id": (
                    calendar_event.source_id
                ),

                "match_status": "CALENDAR_ONLY",

                "confidence": 0.0,

                "match_reasons": [],

                "title": calendar_event.title,

                "date": calendar_event.date,

                "start_time": calendar_event.start_time,

                "end_time": calendar_event.end_time,

                "client_name": calendar_event.client_name,

                "company": calendar_event.company,

                "organizer": calendar_event.organizer,

                "attendees": calendar_event.attendees,

                "location": calendar_event.location,

                "meeting_type": calendar_event.meeting_type,

                "status": calendar_event.status,

                "conflicts": [],

                "validation_issues": (
                    calendar_event.validation_issues
                ),

                "sources": {
                    "crm": None,
                    "calendar": calendar_event.raw,
                },
            }
        )

    return results


# ============================================================
# DUPLICATE DETECTION
# ============================================================

def detect_duplicates(
    events: list[NormalizedEvent],
) -> list[DuplicateResult]:

    duplicates: list[DuplicateResult] = []

    # --------------------------------------------------------
    # Separate CRM and Calendar records
    #
    # Duplicate Explorer is specifically interested in
    # identifying the same real-world meeting represented
    # independently in CRM and Calendar.
    # --------------------------------------------------------

    crm_events = [
        event
        for event in events
        if event.source.lower() == "crm"
    ]

    calendar_events = [
        event
        for event in events
        if event.source.lower() in {
            "calendar",
            "google_calendar",
            "outlook",
        }
    ]

    # --------------------------------------------------------
    # Compare every CRM event against every Calendar event
    # --------------------------------------------------------

    for crm_event in crm_events:

        for calendar_event in calendar_events:

            score, reasons = score_candidate(
                crm_event,
                calendar_event,
            )

            # ------------------------------------------------
            # Require enough evidence to call this a
            # possible duplicate.
            #
            # 0.60 matches the same threshold used by the
            # reconciliation engine.
            # ------------------------------------------------

            if score < 0.60:
                continue

            # ------------------------------------------------
            # Strengthen reasons specifically for Duplicate
            # Explorer.
            # ------------------------------------------------

            duplicate_reasons = list(reasons)

            duplicate_reasons.insert(
                0,
                "CRM and Calendar records may represent the same meeting",
            )

            # ------------------------------------------------
            # DuplicateResult domain model supports one source
            # plus record_id and duplicate_of.
            #
            # We use CRM as the primary record and Calendar as
            # the possible duplicate.
            # ------------------------------------------------

            duplicates.append(
                DuplicateResult(
                    source="crm",
                    record_id=crm_event.source_id,
                    duplicate_of=calendar_event.source_id,
                    confidence=round(score, 2),
                    reasons=duplicate_reasons,
                )
            )

    return duplicates


# ============================================================
# DUPLICATE COUNT
# ============================================================

def count_duplicate_records(
    events: list[NormalizedEvent],
) -> int:
    return len(
        detect_duplicates(events)
    )