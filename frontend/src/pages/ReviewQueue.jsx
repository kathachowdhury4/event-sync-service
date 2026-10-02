import React, {
useEffect,
useMemo,
useState,
} from "react";

import {
getMeetingsByStatus,
getConflictMeetings,
getMeetings,
} from "../services/api";

import "./ReviewQueue.css";

/* =========================================================
FORMATTERS
========================================================= */

function formatDate(value) {
if (!value) {
return "—";
}

try {
const date = new Date(value);


if (Number.isNaN(date.getTime())) {
  return String(value);
}

return date.toLocaleDateString(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});


} catch {
return String(value);
}
}

function formatTime(value) {
if (!value) {
return "—";
}

try {
const date = new Date(value);

if (!Number.isNaN(date.getTime())) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}


} catch {
// Fall through to raw value.
}

return String(value);
}

/* =========================================================
DATA HELPERS
========================================================= */

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
meeting?.company ||
"Unknown client"
);
}

function getConfidence(meeting) {
const value = Number(
meeting?.confidence ?? 0
);

if (Number.isNaN(value)) {
return 0;
}

return value <= 1
? Math.round(value * 100)
: Math.round(value);
}

function getConfidenceClass(confidence) {
if (confidence >= 80) {
return "high";
}

if (confidence >= 60) {
return "medium";
}

return "low";
}

function getConflictCount(meeting) {
if (Array.isArray(meeting?.conflicts)) {
return meeting.conflicts.length;
}

if (typeof meeting?.conflicts === "number") {
return meeting.conflicts;
}

if (meeting?.conflicts) {
return 1;
}

return 0;
}

function getValidationCount(meeting) {
if (
Array.isArray(
meeting?.validation_issues
)
) {
return meeting.validation_issues.length;
}

if (
typeof meeting?.validation_issues ===
"number"
) {
return meeting.validation_issues;
}

return 0;
}

function getMeetingId(meeting, index) {
return (
meeting?.meeting_id ||
meeting?.id ||
meeting?.reconciled_id ||
"MEETING-" + (index + 1)
);
}

/* =========================================================
REVIEW LOGIC
========================================================= */

function getReviewReasons(meeting) {
const reasons = [];

const confidence =
getConfidence(meeting);

const conflicts =
getConflictCount(meeting);

const validationIssues =
getValidationCount(meeting);

if (confidence < 80) {
reasons.push(
"Low reconciliation confidence"
);
}

if (conflicts > 0) {
reasons.push(
conflicts +
" source conflict" +
(conflicts > 1 ? "s" : "")
);
}

if (validationIssues > 0) {
reasons.push(
validationIssues +
" validation issue" +
(validationIssues > 1 ? "s" : "")
);
}

if (
Array.isArray(meeting?.match_reasons) &&
meeting.match_reasons.length === 0
) {
reasons.push("Limited match evidence");
}

if (reasons.length === 0) {
reasons.push(
"Manual verification recommended"
);
}

return reasons;
}

function getPriority(meeting) {
const confidence =
getConfidence(meeting);

const conflicts =
getConflictCount(meeting);

const validationIssues =
getValidationCount(meeting);

if (
confidence < 60 ||
validationIssues > 0 ||
conflicts >= 2
) {
return "HIGH";
}

if (
confidence < 80 ||
conflicts > 0
) {
return "MEDIUM";
}

return "LOW";
}

/* =========================================================
UI COMPONENTS
========================================================= */

function ReviewBadge({ value }) {
const normalized = String(
value || "UNKNOWN"
).toUpperCase();

return (
<span
className={
"review-badge " +
normalized.toLowerCase()
}
>
{normalized} </span>
);
}

/* =========================================================
REVIEW QUEUE
========================================================= */

function ReviewQueue() {
const [meetings, setMeetings] =
useState([]);

const [selectedMeeting, setSelectedMeeting] =
useState(null);

const [filter, setFilter] =
useState("ALL");

const [search, setSearch] =
useState("");

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState("");

/* =======================================================
LOAD DATA
======================================================= */

useEffect(() => {
loadReviewData();
}, []);

async function loadReviewData() {
try {
setLoading(true);
setError("");


  const [
    matchedResponse,
    conflictResponse,
    allResponse,
  ] = await Promise.all([
    getMeetingsByStatus("MATCHED"),
    getConflictMeetings(),
    getMeetings(),
  ]);

  const matched = Array.isArray(
    matchedResponse
  )
    ? matchedResponse
    : matchedResponse?.meetings || [];

  const conflicts = Array.isArray(
    conflictResponse
  )
    ? conflictResponse
    : conflictResponse?.meetings || [];

  const all = Array.isArray(
    allResponse
  )
    ? allResponse
    : allResponse?.meetings || [];

  /*
   * Build a unique collection of meetings
   * requiring review.
   */
  const candidateMap = new Map();

  [
    ...matched,
    ...conflicts,
    ...all,
  ].forEach((meeting, index) => {
    const id = getMeetingId(
      meeting,
      index
    );

    const confidence =
      getConfidence(meeting);

    const conflictCount =
      getConflictCount(meeting);

    const validationCount =
      getValidationCount(meeting);

    const needsReview =
      confidence < 80 ||
      conflictCount > 0 ||
      validationCount > 0;

    if (needsReview) {
      candidateMap.set(id, {
        ...meeting,
        meeting_id: id,
      });
    }
  });

  const candidates =
    Array.from(
      candidateMap.values()
    );

  /*
   * Sort:
   * HIGH
   * MEDIUM
   * LOW
   *
   * Within the same priority,
   * lowest confidence first.
   */
  candidates.sort((a, b) => {
    const priorityOrder = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    const priorityDifference =
      priorityOrder[
        getPriority(a)
      ] -
      priorityOrder[
        getPriority(b)
      ];

    if (
      priorityDifference !== 0
    ) {
      return priorityDifference;
    }

    return (
      getConfidence(a) -
      getConfidence(b)
    );
  });

  setMeetings(candidates);

  if (candidates.length > 0) {
    setSelectedMeeting(
      candidates[0]
    );
  } else {
    setSelectedMeeting(null);
  }
} catch (err) {
  console.error(
    "Failed to load review queue:",
    err
  );

  setError(
    err?.message ||
      "Unable to load review queue."
  );
} finally {
  setLoading(false);
}


}

/* =======================================================
FILTERED MEETINGS
======================================================= */

const filteredMeetings = useMemo(() => {
const normalizedSearch =
search.trim().toLowerCase();


return meetings.filter((meeting) => {
  const conflicts =
    getConflictCount(meeting);

  const validationIssues =
    getValidationCount(meeting);

  const priority =
    getPriority(meeting);

  const matchesFilter =
    filter === "ALL" ||
    (
      filter === "HIGH" &&
      priority === "HIGH"
    ) ||
    (
      filter === "MEDIUM" &&
      priority === "MEDIUM"
    ) ||
    (
      filter === "LOW" &&
      priority === "LOW"
    ) ||
    (
      filter === "CONFLICTS" &&
      conflicts > 0
    ) ||
    (
      filter === "VALIDATION" &&
      validationIssues > 0
    );

  if (!matchesFilter) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  const searchableText = [
    getTitle(meeting),
    getClient(meeting),
    meeting?.company,
    meeting?.crm_id,
    meeting?.calendar_id,
    meeting?.meeting_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(
    normalizedSearch
  );
});


}, [
meetings,
filter,
search,
]);

/* =======================================================
STATISTICS
======================================================= */

const statistics = useMemo(() => {
const total = meetings.length;

const high = meetings.filter(
  (meeting) =>
    getPriority(meeting) ===
    "HIGH"
).length;

const medium = meetings.filter(
  (meeting) =>
    getPriority(meeting) ===
    "MEDIUM"
).length;

const conflicts =
  meetings.filter(
    (meeting) =>
      getConflictCount(meeting) > 0
  ).length;

const validation =
  meetings.filter(
    (meeting) =>
      getValidationCount(meeting) >
      0
  ).length;

return {
  total,
  high,
  medium,
  conflicts,
  validation,
};


}, [meetings]);

/* =======================================================
SELECTION
======================================================= */

function selectMeeting(meeting) {
setSelectedMeeting(meeting);
}

/* =======================================================
LOADING
======================================================= */

if (loading) {
return ( <div className="review-page"> <div className="review-state"> <div className="review-spinner"></div>


      <h2>
        Loading Review Queue
      </h2>

      <p>
        Collecting reconciliation
        results that require manual
        attention.
      </p>
    </div>
  </div>
);


}

/* =======================================================
ERROR
======================================================= */

if (error) {
return ( <div className="review-page"> <div className="review-state review-error"> <div className="review-state-icon">
! </div>


      <h2>
        Unable to Load Review Queue
      </h2>

      <p>{error}</p>

      <button
        type="button"
        className="review-retry-button"
        onClick={loadReviewData}
      >
        Retry
      </button>
    </div>
  </div>
);


}

/* =======================================================
MAIN UI
======================================================= */

return ( <div className="review-page">


  {/* PAGE HEADER */}
  <div className="review-header">
    <div>
      <div className="review-breadcrumb">
        Workspace / Review Queue
      </div>

      <h1>
        Review Queue
      </h1>

      <p>
        Meetings requiring manual
        verification based on
        reconciliation confidence,
        source conflicts, or data
        quality issues.
      </p>
    </div>

    <div className="review-live-status">
      <span className="review-live-dot"></span>
      Reconciliation data loaded
    </div>
  </div>

  {/* SUMMARY */}
  <div className="review-summary">

    <div className="review-summary-card total">
      <span>
        Items for Review
      </span>

      <strong>
        {statistics.total}
      </strong>

      <small>
        Requires attention
      </small>
    </div>

    <div className="review-summary-card high">
      <span>
        High Priority
      </span>

      <strong>
        {statistics.high}
      </strong>

      <small>
        Immediate review
      </small>
    </div>

    <div className="review-summary-card medium">
      <span>
        Medium Priority
      </span>

      <strong>
        {statistics.medium}
      </strong>

      <small>
        Verification recommended
      </small>
    </div>

    <div className="review-summary-card conflict">
      <span>
        With Conflicts
      </span>

      <strong>
        {statistics.conflicts}
      </strong>

      <small>
        Source differences
      </small>
    </div>

    <div className="review-summary-card validation">
      <span>
        Data Quality
      </span>

      <strong>
        {statistics.validation}
      </strong>

      <small>
        Validation issues
      </small>
    </div>

  </div>

  {/* TOOLBAR */}
  <div className="review-toolbar">

    <div className="review-search">
      <span>⌕</span>

      <input
        type="text"
        placeholder="Search meeting, client, CRM ID or Calendar ID..."
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value
          )
        }
      />

      {search && (
        <button
          type="button"
          onClick={() =>
            setSearch("")
          }
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>

    <div className="review-filter">
      <label htmlFor="review-filter">
        Filter
      </label>

      <select
        id="review-filter"
        value={filter}
        onChange={(event) =>
          setFilter(
            event.target.value
          )
        }
      >
        <option value="ALL">
          All Review Items
        </option>

        <option value="HIGH">
          High Priority
        </option>

        <option value="MEDIUM">
          Medium Priority
        </option>

        <option value="LOW">
          Low Priority
        </option>

        <option value="CONFLICTS">
          With Conflicts
        </option>

        <option value="VALIDATION">
          Validation Issues
        </option>
      </select>
    </div>

    <button
      type="button"
      className="review-refresh-button"
      onClick={loadReviewData}
    >
      ↻ Refresh
    </button>

  </div>

  {/* EMPTY QUEUE */}
  {meetings.length === 0 ? (
    <div className="review-empty">

      <div className="review-empty-icon">
        ✓
      </div>

      <h2>
        No Items Require Review
      </h2>

      <p>
        All currently processed
        meetings meet the configured
        review criteria.
      </p>

    </div>
  ) : (

    /* REVIEW CONTENT */
    <div className="review-content">

      {/* LEFT LIST */}
      <section className="review-list-card">

        <div className="review-list-header">
          <div>
            <h2>
              Pending Review
            </h2>

            <p>
              Select a meeting to
              inspect its
              reconciliation details.
            </p>
          </div>

          <span className="review-count">
            {filteredMeetings.length}
          </span>
        </div>

        <div className="review-list">

          {filteredMeetings.length ===
          0 ? (
            <div className="review-no-results">
              No meetings match the
              current filter.
            </div>
          ) : (

            filteredMeetings.map(
              (meeting, index) => {

                const id =
                  getMeetingId(
                    meeting,
                    index
                  );

                const confidence =
                  getConfidence(
                    meeting
                  );

                const priority =
                  getPriority(
                    meeting
                  );

                const conflicts =
                  getConflictCount(
                    meeting
                  );

                const isSelected =
                  selectedMeeting?.meeting_id ===
                  id;

                return (
                  <button
                    key={id}
                    type="button"
                    className={
                      "review-list-item " +
                      (
                        isSelected
                          ? "selected"
                          : ""
                      )
                    }
                    onClick={() =>
                      selectMeeting({
                        ...meeting,
                        meeting_id: id,
                      })
                    }
                  >

                    <div className="review-item-top">

                      <div className="review-item-title">
                        {getTitle(
                          meeting
                        )}
                      </div>

                      <span
                        className={
                          "review-confidence " +
                          getConfidenceClass(
                            confidence
                          )
                        }
                      >
                        {confidence}%
                      </span>

                    </div>

                    <div className="review-item-client">
                      {getClient(
                        meeting
                      )}
                    </div>

                    <div className="review-item-meta">

                      <span>
                        {formatDate(
                          meeting?.date
                        )}
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        {formatTime(
                          meeting?.start_time
                        )}
                      </span>

                      {meeting?.crm_id && (
                        <>
                          <span>
                            •
                          </span>

                          <span>
                            {
                              meeting.crm_id
                            }
                          </span>
                        </>
                      )}

                    </div>

                    <div className="review-item-footer">

                      <ReviewBadge
                        value={
                          priority
                        }
                      />

                      {conflicts >
                        0 && (
                        <span className="review-conflict-tag">
                          {conflicts}{" "}
                          conflict
                          {conflicts >
                          1
                            ? "s"
                            : ""}
                        </span>
                      )}

                      {getValidationCount(
                        meeting
                      ) > 0 && (
                        <span className="review-validation-tag">
                          Validation
                        </span>
                      )}

                    </div>

                  </button>
                );
              }
            )

          )}

        </div>
      </section>

      {/* RIGHT DETAIL */}
      <section className="review-detail">

        {!selectedMeeting ? (
          <div className="review-detail-empty">

            <div className="review-empty-icon">
              !
            </div>

            <h2>
              Select a Review Item
            </h2>

            <p>
              Choose a meeting from the
              queue to inspect the review
              reasons.
            </p>

          </div>
        ) : (

          <>
            {/* DETAIL HEADER */}
            <div className="review-detail-card">

              <div className="review-detail-header">

                <div>

                  <div className="review-detail-breadcrumb">
                    Review Item /{" "}
                    {
                      selectedMeeting.meeting_id
                    }
                  </div>

                  <h2>
                    {getTitle(
                      selectedMeeting
                    )}
                  </h2>

                  <p>
                    {getClient(
                      selectedMeeting
                    )}
                  </p>

                </div>

                <div className="review-detail-badges">

                  <ReviewBadge
                    value={getPriority(
                      selectedMeeting
                    )}
                  />

                  <span
                    className={
                      "review-confidence large " +
                      getConfidenceClass(
                        getConfidence(
                          selectedMeeting
                        )
                      )
                    }
                  >
                    {getConfidence(
                      selectedMeeting
                    )}
                    % confidence
                  </span>

                </div>

              </div>

              <div className="review-detail-stats">

                <div>
                  <span>
                    CRM Record
                  </span>

                  <strong>
                    {
                      selectedMeeting.crm_id ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Calendar Record
                  </span>

                  <strong>
                    {
                      selectedMeeting.calendar_id ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedMeeting.date
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Start Time
                  </span>

                  <strong>
                    {formatTime(
                      selectedMeeting.start_time
                    )}
                  </strong>
                </div>

              </div>

            </div>

            {/* REVIEW REASONS */}
            <div className="review-reasons-card">

              <div className="review-section-header">

                <div>
                  <h2>
                    Why This Needs Review
                  </h2>

                  <p>
                    Review signals generated
                    from reconciliation
                    results.
                  </p>
                </div>

                <span className="review-section-count">
                  {
                    getReviewReasons(
                      selectedMeeting
                    ).length
                  }
                </span>

              </div>

              <div className="review-reasons">

                {getReviewReasons(
                  selectedMeeting
                ).map(
                  (
                    reason,
                    index
                  ) => (
                    <div
                      className="review-reason"
                      key={
                        reason +
                        "-" +
                        index
                      }
                    >
                      <span className="review-reason-icon">
                        !
                      </span>

                      <span>
                        {reason}
                      </span>
                    </div>
                  )
                )}

              </div>

            </div>

            {/* REVIEW SUMMARY */}
            <div className="review-source-card">

              <div className="review-section-header">

                <div>
                  <h2>
                    Review Summary
                  </h2>

                  <p>
                    Key reconciliation
                    information for the
                    selected meeting.
                  </p>
                </div>

              </div>

              <div className="review-source-grid">

                <div className="review-source-box">
                  <span>
                    Match Status
                  </span>

                  <strong>
                    {String(
                      selectedMeeting.match_status ||
                        "UNKNOWN"
                    ).replace(
                      /_/g,
                      " "
                    )}
                  </strong>
                </div>

                <div className="review-source-box">
                  <span>
                    Conflicts
                  </span>

                  <strong>
                    {getConflictCount(
                      selectedMeeting
                    )}
                  </strong>
                </div>

                <div className="review-source-box">
                  <span>
                    Validation Issues
                  </span>

                  <strong>
                    {getValidationCount(
                      selectedMeeting
                    )}
                  </strong>
                </div>

                <div className="review-source-box">
                  <span>
                    Match Evidence
                  </span>

                  <strong>
                    {
                      Array.isArray(
                        selectedMeeting.match_reasons
                      )
                        ? selectedMeeting
                            .match_reasons
                            .length
                        : 0
                    }
                  </strong>
                </div>

              </div>

            </div>

            {/* SOURCE CONFLICTS */}
            {Array.isArray(
              selectedMeeting.conflicts
            ) &&
              selectedMeeting.conflicts
                .length > 0 && (

                <div className="review-conflicts-card">

                  <div className="review-section-header">

                    <div>
                      <h2>
                        Source Conflicts
                      </h2>

                      <p>
                        Values that differ
                        between source
                        systems.
                      </p>
                    </div>

                    <span className="review-section-count conflict-count">
                      {
                        selectedMeeting
                          .conflicts
                          .length
                      }
                    </span>

                  </div>

                  <div className="review-conflicts">

                    {selectedMeeting.conflicts.map(
                      (
                        conflict,
                        index
                      ) => (

                        <div
                          className="review-conflict"
                          key={
                            (
                              conflict.field ||
                              "conflict"
                            ) +
                            "-" +
                            index
                          }
                        >

                          <div className="review-conflict-field">
                            {
                              conflict.field ||
                              "Unknown field"
                            }
                          </div>

                          <div className="review-conflict-values">

                            <div>
                              <span>
                                CRM
                              </span>

                              <strong>
                                {String(
                                  conflict.crm_value ??
                                    "—"
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Calendar
                              </span>

                              <strong>
                                {String(
                                  conflict.calendar_value ??
                                    "—"
                                )}
                              </strong>
                            </div>

                          </div>

                          {conflict.severity && (
                            <span
                              className={
                                "review-conflict-severity " +
                                String(
                                  conflict.severity
                                ).toLowerCase()
                              }
                            >
                              {
                                conflict.severity
                              }
                            </span>
                          )}

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

            {/* ACTION / STATUS */}
            <div className="review-action-card">

              <div>

                <strong>
                  Human review required
                </strong>

                <p>
                  This screen provides
                  the evidence needed
                  for a reviewer to
                  verify the
                  reconciliation
                  decision.
                </p>

              </div>

              <div className="review-action-status">
                Pending Review
              </div>

            </div>

          </>
        )}

      </section>

    </div>
  )}

</div>
);
}
export default ReviewQueue;
