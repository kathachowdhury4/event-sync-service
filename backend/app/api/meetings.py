from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import (
    MeetingResponse,
    ReconciliationSummary,
)
from app.services.ingestion import (
    load_calendar_events,
    load_crm_events,
)
from app.services.reconciliation import (
    detect_duplicates,
    reconcile,
)


router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"],
)


# ============================================================
# VALIDATION ISSUE CONVERSION
# ============================================================

def convert_validation_issues(
    issues,
) -> list[dict]:

    converted = []

    for issue in issues or []:

        if isinstance(issue, dict):
            converted.append(issue)
            continue

        converted.append(
            {
                "source": issue.source,
                "record_id": issue.record_id,
                "field": issue.field,
                "message": issue.message,
                "severity": issue.severity,
            }
        )

    return converted


# ============================================================
# BUILD DATASET
# ============================================================

def build_dataset():

    crm_events = load_crm_events(
        settings.CRM_FILE
    )

    calendar_events = load_calendar_events(
        settings.CALENDAR_FILE
    )

    reconciliation_results = reconcile(
        crm_events,
        calendar_events,
    )

    duplicates = detect_duplicates(
        crm_events + calendar_events
    )

    crm_map = {
        event.source_id: event
        for event in crm_events
    }

    calendar_map = {
        event.source_id: event
        for event in calendar_events
    }

    meetings = []

    for result in reconciliation_results:

        # ----------------------------------------------------
        # reconciliation.py returns dictionaries
        # ----------------------------------------------------

        crm_id = result.get("crm_id")

        calendar_id = result.get(
            "calendar_id"
        )

        match_status = result.get(
            "match_status",
            "UNKNOWN",
        )

        confidence = result.get(
            "confidence",
            0.0,
        )

        match_reasons = result.get(
            "match_reasons",
            [],
        )

        conflicts = result.get(
            "conflicts",
            [],
        )

        validation_issues = (
            convert_validation_issues(
                result.get(
                    "validation_issues",
                    [],
                )
            )
        )

        # ----------------------------------------------------
        # Find original events
        # ----------------------------------------------------

        crm = (
            crm_map.get(crm_id)
            if crm_id
            else None
        )

        calendar = (
            calendar_map.get(calendar_id)
            if calendar_id
            else None
        )

        primary = crm or calendar

        if not primary:
            continue

        # ----------------------------------------------------
        # Attendees
        # ----------------------------------------------------

        attendees = []

        if crm:

            attendees.extend(
                crm.attendees
            )

        if calendar:

            for attendee in calendar.attendees:

                if attendee not in attendees:

                    attendees.append(
                        attendee
                    )

        # ----------------------------------------------------
        # Date
        # ----------------------------------------------------

        date = (
            primary.date.isoformat()
            if primary.date
            else None
        )

        # ----------------------------------------------------
        # Start time
        # ----------------------------------------------------

        start_time = (
            primary.start_time.isoformat()
            if primary.start_time
            else None
        )

        # ----------------------------------------------------
        # End time
        # ----------------------------------------------------

        end_time = (
            primary.end_time.isoformat()
            if primary.end_time
            else None
        )

        # ----------------------------------------------------
        # Meeting ID
        # ----------------------------------------------------

        meeting_id = (
            result.get("meeting_id")
            or (
                f"{crm_id or 'NONE'}"
                f"-"
                f"{calendar_id or 'NONE'}"
            )
        )

        # ----------------------------------------------------
        # Build response model
        # ----------------------------------------------------

        meeting = MeetingResponse(

            meeting_id=meeting_id,

            crm_id=crm_id,

            calendar_id=calendar_id,

            match_status=match_status,

            confidence=round(
                confidence,
                3,
            ),

            match_reasons=match_reasons,

            title=primary.title,

            date=date,

            start_time=start_time,

            end_time=end_time,

            client_name=(
                crm.client_name
                if crm
                else primary.client_name
            ),

            company=(
                crm.company
                if crm
                else primary.company
            ),

            organizer=(
                crm.organizer
                if crm and crm.organizer
                else primary.organizer
            ),

            attendees=attendees,

            location=(
                crm.location
                if crm and crm.location
                else (
                    calendar.location
                    if calendar
                    else primary.location
                )
            ),

            meeting_type=(
                crm.meeting_type
                if crm and crm.meeting_type
                else primary.meeting_type
            ),

            status=(
                crm.status
                if crm and crm.status
                else (
                    calendar.status
                    if calendar
                    else primary.status
                )
            ),

            conflicts=conflicts,

            validation_issues=validation_issues,

            sources={
                "crm": (
                    crm.raw
                    if crm
                    else None
                ),

                "calendar": (
                    calendar.raw
                    if calendar
                    else None
                ),
            },
        )

        meetings.append(
            meeting
        )

    return (
        meetings,
        crm_events,
        calendar_events,
        duplicates,
    )


# ============================================================
# GET ALL MEETINGS
# ============================================================

@router.get(
    "",
    response_model=list[MeetingResponse],
)
def get_meetings(

    source: str | None = Query(
        default=None,
        description=(
            "Filter by source: crm, calendar"
        ),
    ),

    has_conflicts: bool | None = Query(
        default=None
    ),

    match_status: str | None = Query(
        default=None
    ),
):

    (
        meetings,
        _,
        _,
        _,
    ) = build_dataset()

    # --------------------------------------------------------
    # SOURCE FILTER
    # --------------------------------------------------------

    if source:

        source = source.lower()

        if source == "crm":

            meetings = [
                meeting
                for meeting in meetings
                if meeting.crm_id
            ]

        elif source == "calendar":

            meetings = [
                meeting
                for meeting in meetings
                if meeting.calendar_id
            ]

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "source must be "
                    "'crm' or 'calendar'"
                ),
            )

    # --------------------------------------------------------
    # CONFLICT FILTER
    # --------------------------------------------------------

    if has_conflicts is not None:

        meetings = [
            meeting
            for meeting in meetings
            if bool(meeting.conflicts)
            == has_conflicts
        ]

    # --------------------------------------------------------
    # MATCH STATUS FILTER
    # --------------------------------------------------------

    if match_status:

        meetings = [
            meeting
            for meeting in meetings
            if meeting.match_status.upper()
            == match_status.upper()
        ]

    return meetings


# ============================================================
# DUPLICATES
# ============================================================

@router.get(
    "/duplicates",
)
def get_duplicates():

    (
        _,
        _,
        _,
        duplicates,
    ) = build_dataset()

    return [
        {
            "source": duplicate.source,
            "record_id": duplicate.record_id,
            "duplicate_of": duplicate.duplicate_of,
            "confidence": duplicate.confidence,
            "reasons": duplicate.reasons,
        }
        for duplicate in duplicates
    ]


# ============================================================
# RECONCILIATION SUMMARY
# ============================================================

@router.get(
    "/summary/reconciliation",
    response_model=ReconciliationSummary,
)
def get_summary():

    (
        meetings,
        crm_events,
        calendar_events,
        duplicates,
    ) = build_dataset()

    # --------------------------------------------------------
    # MATCHED
    # --------------------------------------------------------

    matched = sum(
        1
        for meeting in meetings
        if meeting.match_status == "MATCHED"
    )

    # --------------------------------------------------------
    # CRM ONLY
    # --------------------------------------------------------

    crm_only = sum(
        1
        for meeting in meetings
        if meeting.match_status == "CRM_ONLY"
    )

    # --------------------------------------------------------
    # CALENDAR ONLY
    # --------------------------------------------------------

    calendar_only = sum(
        1
        for meeting in meetings
        if meeting.match_status == "CALENDAR_ONLY"
    )

    # --------------------------------------------------------
    # CONFLICTS
    # --------------------------------------------------------

    conflicts = sum(
        len(meeting.conflicts)
        for meeting in meetings
    )

    # --------------------------------------------------------
    # VALIDATION ISSUES
    # --------------------------------------------------------

    validation_issues = sum(
        len(meeting.validation_issues)
        for meeting in meetings
    )

    return ReconciliationSummary(

        total_crm_records=len(
            crm_events
        ),

        total_calendar_records=len(
            calendar_events
        ),

        matched_records=matched,

        crm_only_records=crm_only,

        calendar_only_records=calendar_only,

        possible_duplicates=len(
            duplicates
        ),

        conflicts=conflicts,

        validation_issues=validation_issues,
    )


# ============================================================
# GET SINGLE MEETING
#
# IMPORTANT:
# Keep this AFTER /duplicates
# and /summary/reconciliation
# ============================================================

@router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
)
def get_meeting(
    meeting_id: str
):

    meetings, _, _, _ = build_dataset()

    for meeting in meetings:

        if meeting.meeting_id == meeting_id:

            return meeting

    raise HTTPException(
        status_code=404,
        detail="Meeting not found",
    )