import React, { useEffect, useMemo, useState } from "react";
import {
  getMeetings,
  getConflictMeetings,
  getDuplicates,
} from "../services/api";
import "./DuplicateExplorer.css";


function normalizeText(value) {
  if (!value) return "";

  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function getMeetingId(meeting, index = 0) {
  return (
    meeting?.meeting_id ||
    meeting?.id ||
    meeting?.reconciled_id ||
    meeting?.reconciliation_id ||
    `MEETING-${index + 1}`
  );
}


function getTitle(meeting) {
  return (
    meeting?.title ||
    meeting?.subject ||
    meeting?.name ||
    "Untitled Meeting"
  );
}


function getClient(meeting) {
  return (
    meeting?.client_name ||
    meeting?.client ||
    meeting?.customer_name ||
    "-"
  );
}


function getCompany(meeting) {
  return (
    meeting?.company ||
    meeting?.client_company ||
    meeting?.company_name ||
    "-"
  );
}


function getDate(meeting) {
  return (
    meeting?.date ||
    meeting?.meeting_date ||
    meeting?.start_time ||
    "-"
  );
}


function getStartTime(meeting) {
  return (
    meeting?.start_time ||
    meeting?.start ||
    "-"
  );
}


function getLocation(meeting) {
  return meeting?.location || "-";
}


function getCrmId(meeting) {
  return (
    meeting?.crm_id ||
    meeting?.sources?.crm?.crm_id ||
    meeting?.sources?.crm?.source_id ||
    "-"
  );
}


function getCalendarId(meeting) {
  return (
    meeting?.calendar_id ||
    meeting?.sources?.calendar?.event_id ||
    meeting?.sources?.calendar?.source_id ||
    "-"
  );
}


function getConflicts(meeting) {
  return Array.isArray(meeting?.conflicts)
    ? meeting.conflicts
    : [];
}


function formatDate(value) {
  if (!value || value === "-") {
    return "-";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}


function formatTime(value) {
  if (!value || value === "-") {
    return "-";
  }

  try {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return String(value);
  } catch {
    return String(value);
  }
}


/*
 * Convert backend duplicate result into the shape
 * expected by the Duplicate Explorer UI.
 */
function normalizeDuplicate(duplicate, meetings) {
  const recordId = duplicate?.record_id;
  const duplicateOf = duplicate?.duplicate_of;

  const source = String(
    duplicate?.source || ""
  ).toLowerCase();

  let first = null;
  let second = null;

  /*
   * First try to locate records by their actual IDs.
   */
  first = meetings.find((meeting) => {
    const crmId = getCrmId(meeting);
    const calendarId = getCalendarId(meeting);
    const meetingId = getMeetingId(meeting);

    return (
      meetingId === recordId ||
      crmId === recordId ||
      calendarId === recordId
    );
  });

  second = meetings.find((meeting) => {
    const crmId = getCrmId(meeting);
    const calendarId = getCalendarId(meeting);
    const meetingId = getMeetingId(meeting);

    return (
      meetingId === duplicateOf ||
      crmId === duplicateOf ||
      calendarId === duplicateOf
    );
  });

  /*
   * If the backend source tells us this is a CRM
   * duplicate, prefer CRM as the first record.
   */
  if (source === "crm" && first) {
    const crmFirst = getCrmId(first);

    if (crmFirst !== recordId) {
      const alternative = meetings.find(
        (meeting) =>
          getCrmId(meeting) === recordId
      );

      if (alternative) {
        first = alternative;
      }
    }
  }

  /*
   * If the backend source tells us this is a
   * calendar duplicate, locate it accordingly.
   */
  if (source === "calendar" && first) {
    const calendarFirst = getCalendarId(first);

    if (calendarFirst !== recordId) {
      const alternative = meetings.find(
        (meeting) =>
          getCalendarId(meeting) === recordId
      );

      if (alternative) {
        first = alternative;
      }
    }
  }

  /*
   * Backend DuplicateResult has confidence from
   * 0 to 1. Convert it to percentage.
   */
  const confidence = Number(
    duplicate?.confidence ?? 0
  );

  const score =
    confidence <= 1
      ? Math.round(confidence * 100)
      : Math.round(confidence);

  return {
    id: `${recordId}|${duplicateOf}`,
    score,
    reasons: Array.isArray(duplicate?.reasons)
      ? duplicate.reasons
      : [],
    first,
    second,
    firstId: recordId,
    secondId: duplicateOf,
    source,
    backendRecord: duplicate,
  };
}


function DuplicateExplorer() {
  const [meetings, setMeetings] = useState([]);
  const [conflictMeetings, setConflictMeetings] =
    useState([]);

  const [backendDuplicates, setBackendDuplicates] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDuplicate, setSelectedDuplicate] =
    useState(null);

  const [search, setSearch] = useState("");

  const [minimumScore, setMinimumScore] =
    useState("60");


  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        allMeetings,
        conflicts,
        duplicates,
      ] = await Promise.all([
        getMeetings(),
        getConflictMeetings(),
        getDuplicates(),
      ]);

      console.log(
        "Duplicate Explorer - meetings:",
        allMeetings
      );

      console.log(
        "Duplicate Explorer - conflicts:",
        conflicts
      );

      console.log(
        "Duplicate Explorer - duplicates:",
        duplicates
      );

      setMeetings(
        Array.isArray(allMeetings)
          ? allMeetings
          : []
      );

      setConflictMeetings(
        Array.isArray(conflicts)
          ? conflicts
          : []
      );

      setBackendDuplicates(
        Array.isArray(duplicates)
          ? duplicates
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load duplicate explorer data:",
        err
      );

      setError(
        err?.message ||
          "Failed to load duplicate data"
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadData();
  }, []);


  /*
   * Convert backend duplicate records into
   * frontend duplicate groups.
   */
  const duplicateGroups = useMemo(() => {
    const groups = backendDuplicates
      .map((duplicate) =>
        normalizeDuplicate(
          duplicate,
          meetings
        )
      )
      .filter(
        (group) =>
          group.score >= Number(minimumScore)
      );

    return groups.sort(
      (a, b) => b.score - a.score
    );
  }, [
    backendDuplicates,
    meetings,
    minimumScore,
  ]);


  const filteredDuplicates = useMemo(() => {
    const query = normalizeText(search);

    if (!query) {
      return duplicateGroups;
    }

    return duplicateGroups.filter((group) => {
      const searchableText =
        normalizeText(
          [
            getTitle(group.first),
            getTitle(group.second),

            getClient(group.first),
            getClient(group.second),

            getCompany(group.first),
            getCompany(group.second),

            getCrmId(group.first),
            getCrmId(group.second),

            getCalendarId(group.first),
            getCalendarId(group.second),
          ].join(" ")
        );

      return searchableText.includes(query);
    });
  }, [
    duplicateGroups,
    search,
  ]);


  const highConfidenceCount =
    backendDuplicates.filter((duplicate) => {
      const confidence = Number(
        duplicate?.confidence ?? 0
      );

      const score =
        confidence <= 1
          ? confidence * 100
          : confidence;

      return score >= 80;
    }).length;


  const mediumConfidenceCount =
    backendDuplicates.filter((duplicate) => {
      const confidence = Number(
        duplicate?.confidence ?? 0
      );

      const score =
        confidence <= 1
          ? confidence * 100
          : confidence;

      return score >= 60 && score < 80;
    }).length;


  const conflictCount =
    conflictMeetings.length;


  if (loading) {
    return (
      <div className="duplicate-page">
        <div className="duplicate-state">
          <div className="duplicate-spinner" />

          <p>
            Analyzing meetings for possible
            duplicates...
          </p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="duplicate-page">
        <div className="duplicate-state duplicate-error">

          <div className="duplicate-error-icon">
            !
          </div>

          <h2>
            Unable to load duplicate data
          </h2>

          <p>{error}</p>

          <button
            className="duplicate-retry-button"
            onClick={loadData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="duplicate-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="duplicate-header">

        <div>

          <div className="duplicate-breadcrumb">
            Workspace / Duplicate Explorer
          </div>

          <h1>
            Duplicate Explorer
          </h1>

          <p>
            Identify meetings that may represent
            the same real-world event across CRM
            and calendar sources.
          </p>

        </div>

        <div className="duplicate-live-status">
          <span className="duplicate-live-dot" />
          Analysis Ready
        </div>

      </div>


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="duplicate-summary">

        <div className="duplicate-summary-card total">

          <div className="duplicate-summary-icon">
            ◉
          </div>

          <div>

            <span className="duplicate-summary-label">
              Possible Duplicates
            </span>

            <strong>
              {duplicateGroups.length}
            </strong>

          </div>

        </div>


        <div className="duplicate-summary-card high">

          <div className="duplicate-summary-icon">
            !
          </div>

          <div>

            <span className="duplicate-summary-label">
              High Similarity
            </span>

            <strong>
              {highConfidenceCount}
            </strong>

          </div>

        </div>


        <div className="duplicate-summary-card medium">

          <div className="duplicate-summary-icon">
            ~
          </div>

          <div>

            <span className="duplicate-summary-label">
              Medium Similarity
            </span>

            <strong>
              {mediumConfidenceCount}
            </strong>

          </div>

        </div>


        <div className="duplicate-summary-card conflicts">

          <div className="duplicate-summary-icon">
            ⚠
          </div>

          <div>

            <span className="duplicate-summary-label">
              Records With Conflicts
            </span>

            <strong>
              {conflictCount}
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <div className="duplicate-toolbar">

        <div className="duplicate-search-wrapper">

          <span className="duplicate-search-icon">
            ⌕
          </span>

          <input
            type="text"
            className="duplicate-search"
            placeholder="Search title, client, company, CRM ID..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>


        <select
          className="duplicate-filter"
          value={minimumScore}
          onChange={(event) => {
            setMinimumScore(
              event.target.value
            );

            setSelectedDuplicate(null);
          }}
        >

          <option value="50">
            Similarity ≥ 50%
          </option>

          <option value="60">
            Similarity ≥ 60%
          </option>

          <option value="70">
            Similarity ≥ 70%
          </option>

          <option value="80">
            Similarity ≥ 80%
          </option>

        </select>


        <button
          className="duplicate-refresh-button"
          onClick={loadData}
        >
          ↻ Refresh
        </button>

      </div>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="duplicate-content">

        {/* ===================================================
            DUPLICATE LIST
        =================================================== */}

        <div className="duplicate-list-card">

          <div className="duplicate-list-header">

            <div>

              <h2>
                Possible Duplicate Groups
              </h2>

              <span>
                {filteredDuplicates.length} groups
              </span>

            </div>

          </div>


          {filteredDuplicates.length === 0 ? (

            <div className="duplicate-no-results">

              <div className="duplicate-empty-icon">
                ✓
              </div>

              <h3>
                No possible duplicates found
              </h3>

              <p>
                No meeting pairs meet the selected
                similarity threshold.
              </p>

            </div>

          ) : (

            <div className="duplicate-list">

              {filteredDuplicates.map(
                (group) => (

                  <button
                    key={group.id}
                    className={`duplicate-list-item ${
                      selectedDuplicate?.id ===
                      group.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedDuplicate(
                        group
                      )
                    }
                  >

                    <div className="duplicate-item-top">

                      <div>

                        <h3>
                          {getTitle(
                            group.first
                          )}
                        </h3>

                        <p>
                          {getCompany(
                            group.first
                          )}
                        </p>

                      </div>


                      <span
                        className={`duplicate-score ${
                          group.score >= 80
                            ? "high"
                            : "medium"
                        }`}
                      >
                        {group.score}%
                      </span>

                    </div>


                    <div className="duplicate-item-meta">

                      <span>
                        {getClient(
                          group.first
                        )}
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        {formatDate(
                          getDate(
                            group.first
                          )
                        )}
                      </span>

                    </div>


                    <div className="duplicate-item-footer">

                      <span>
                        {getCrmId(
                          group.first
                        )}
                      </span>

                      <span>
                        ↔
                      </span>

                      <span>
                        {getCalendarId(
                          group.second
                        )}
                      </span>

                    </div>

                  </button>
                )
              )}

            </div>

          )}

        </div>


        {/* ===================================================
            DETAIL
        =================================================== */}

        <div className="duplicate-detail">

          {!selectedDuplicate ? (

            <div className="duplicate-detail-empty">

              <div className="duplicate-detail-empty-icon">
                ◈
              </div>

              <h2>
                Select a possible duplicate
              </h2>

              <p>
                Select a duplicate group from the
                list to inspect the matching evidence
                and compare the source records.
              </p>

            </div>

          ) : (

            <>

              {/* =============================================
                  DETAIL HEADER
              ============================================= */}

              <div className="duplicate-detail-card">

                <div className="duplicate-detail-header">

                  <div>

                    <span className="duplicate-detail-label">
                      POSSIBLE DUPLICATE
                    </span>

                    <h2>
                      {getTitle(
                        selectedDuplicate.first
                      )}
                    </h2>

                    <p>
                      {getCompany(
                        selectedDuplicate.first
                      )}
                    </p>

                  </div>


                  <span
                    className={`duplicate-score large ${
                      selectedDuplicate.score >= 80
                        ? "high"
                        : "medium"
                    }`}
                  >
                    {selectedDuplicate.score}%

                    <small>
                      similarity
                    </small>

                  </span>

                </div>


                <div className="duplicate-detail-stats">

                  <div>
                    <span>
                      Client
                    </span>

                    <strong>
                      {getClient(
                        selectedDuplicate.first
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        getDate(
                          selectedDuplicate.first
                        )
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>
                      CRM
                    </span>

                    <strong>
                      {getCrmId(
                        selectedDuplicate.first
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Calendar
                    </span>

                    <strong>
                      {getCalendarId(
                        selectedDuplicate.second
                      )}
                    </strong>
                  </div>

                </div>

              </div>


              {/* =============================================
                  EVIDENCE
              ============================================= */}

              <div className="duplicate-evidence-card">

                <div className="duplicate-section-header">

                  <div>

                    <span className="duplicate-section-kicker">
                      MATCH ANALYSIS
                    </span>

                    <h3>
                      Why these records may be duplicates
                    </h3>

                  </div>

                  <span className="duplicate-evidence-count">
                    {
                      selectedDuplicate.reasons
                        .length
                    } signals
                  </span>

                </div>


                <div className="duplicate-reasons">

                  {selectedDuplicate.reasons
                    .length === 0 ? (

                    <div className="duplicate-reason">

                      <span className="duplicate-reason-icon">
                        ✓
                      </span>

                      <span>
                        Backend identified these
                        records as potential
                        duplicates.
                      </span>

                    </div>

                  ) : (

                    selectedDuplicate.reasons.map(
                      (reason, index) => (

                        <div
                          className="duplicate-reason"
                          key={`${reason}-${index}`}
                        >

                          <span className="duplicate-reason-icon">
                            ✓
                          </span>

                          <span>
                            {reason}
                          </span>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>


              {/* =============================================
                  SOURCE COMPARISON
              ============================================= */}

              <div className="duplicate-source-card">

                <div className="duplicate-section-header">

                  <div>

                    <span className="duplicate-section-kicker">
                      SOURCE COMPARISON
                    </span>

                    <h3>
                      Record-level comparison
                    </h3>

                  </div>

                </div>


                <div className="duplicate-source-grid">

                  {/* CRM */}

                  <div className="duplicate-source-panel crm">

                    <div className="duplicate-source-header">

                      <span className="duplicate-source-badge">
                        CRM
                      </span>

                      <strong>
                        {getCrmId(
                          selectedDuplicate.first
                        )}
                      </strong>

                    </div>


                    <div className="duplicate-source-row">
                      <span>Title</span>

                      <strong>
                        {getTitle(
                          selectedDuplicate.first
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Client</span>

                      <strong>
                        {getClient(
                          selectedDuplicate.first
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Company</span>

                      <strong>
                        {getCompany(
                          selectedDuplicate.first
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Date</span>

                      <strong>
                        {formatDate(
                          getDate(
                            selectedDuplicate.first
                          )
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Start Time</span>

                      <strong>
                        {formatTime(
                          getStartTime(
                            selectedDuplicate.first
                          )
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Location</span>

                      <strong>
                        {getLocation(
                          selectedDuplicate.first
                        )}
                      </strong>
                    </div>

                  </div>


                  {/* CALENDAR */}

                  <div className="duplicate-source-panel calendar">

                    <div className="duplicate-source-header">

                      <span className="duplicate-source-badge">
                        CALENDAR
                      </span>

                      <strong>
                        {getCalendarId(
                          selectedDuplicate.second
                        )}
                      </strong>

                    </div>


                    <div className="duplicate-source-row">
                      <span>Title</span>

                      <strong>
                        {getTitle(
                          selectedDuplicate.second
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Client</span>

                      <strong>
                        {getClient(
                          selectedDuplicate.second
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Company</span>

                      <strong>
                        {getCompany(
                          selectedDuplicate.second
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Date</span>

                      <strong>
                        {formatDate(
                          getDate(
                            selectedDuplicate.second
                          )
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Start Time</span>

                      <strong>
                        {formatTime(
                          getStartTime(
                            selectedDuplicate.second
                          )
                        )}
                      </strong>
                    </div>


                    <div className="duplicate-source-row">
                      <span>Location</span>

                      <strong>
                        {getLocation(
                          selectedDuplicate.second
                        )}
                      </strong>
                    </div>

                  </div>

                </div>

              </div>


              {/* =============================================
                  REVIEW
              ============================================= */}

              <div className="duplicate-review-card">

                <div>

                  <span className="duplicate-review-icon">
                    !
                  </span>

                </div>


                <div>

                  <h3>
                    Human review recommended
                  </h3>

                  <p>
                    The similarity signals indicate
                    that these records may represent
                    the same real-world meeting. Review
                    the source values before deciding
                    whether they should be treated as
                    duplicates.
                  </p>

                </div>


                <span className="duplicate-review-status">
                  REVIEW
                </span>

              </div>

            </>

          )}

        </div>

      </div>

    </div>
  );
}


export default DuplicateExplorer;