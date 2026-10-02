import React, { useEffect, useMemo, useState } from "react";
import { getMeetingsByStatus } from "../services/api";
import ProvenanceTable from "../components/ProvenanceTable";
import "./Reconciliation.css";

function getMeetingId(meeting, index) {
  return (
    meeting.meeting_id ||
    meeting.id ||
    (
      (meeting.crm_id || "CRM") +
      "-" +
      (meeting.calendar_id || "CAL")
    ) ||
    "MEETING-" + (index + 1)
  );
}

function getConfidencePercent(confidence) {
  const numericValue = Number(confidence || 0);

  if (numericValue <= 1) {
    return Math.round(numericValue * 100);
  }

  return Math.round(numericValue);
}

function getConfidenceClass(confidence) {
  const percent =
    getConfidencePercent(confidence);

  if (percent >= 80) {
    return "high";
  }

  if (percent >= 60) {
    return "medium";
  }

  return "low";
}

function ConfidenceBadge({ confidence }) {
  const percent =
    getConfidencePercent(confidence);

  const confidenceClass =
    getConfidenceClass(confidence);

  return (
    <span
      className={
        "reconciliation-confidence " +
        confidenceClass
      }
    >
      {percent}%
    </span>
  );
}

function StatusBadge({ status }) {
  const normalized =
    String(status || "UNKNOWN").toUpperCase();

  let className = "unknown";

  if (normalized === "MATCHED") {
    className = "matched";
  }

  if (normalized === "CRM_ONLY") {
    className = "crm-only";
  }

  if (normalized === "CALENDAR_ONLY") {
    className = "calendar-only";
  }

  return (
    <span
      className={
        "reconciliation-status " +
        className
      }
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const stringValue = String(value);

  if (stringValue.includes("T")) {
    return stringValue.split("T")[0];
  }

  return stringValue;
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const stringValue = String(value);

  if (stringValue.includes("T")) {
    const timePart =
      stringValue.split("T")[1];

    if (timePart) {
      return timePart.substring(0, 5);
    }
  }

  if (
    stringValue.includes(":") &&
    stringValue.length >= 5
  ) {
    return stringValue.substring(0, 5);
  }

  return stringValue;
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }

    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function MatchReason({ reason }) {
  return (
    <div className="match-reason">
      <span className="match-reason-icon">
        ✓
      </span>

      <span>
        {reason}
      </span>
    </div>
  );
}

function Reconciliation() {
  const [meetings, setMeetings] =
    useState([]);

  const [selectedMeetingId, setSelectedMeetingId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [confidenceFilter, setConfidenceFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadMatchedMeetings() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getMeetingsByStatus(
            "MATCHED"
          );

        const meetingList =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.meetings)
              ? data.meetings
              : [];

        setMeetings(meetingList);

        if (
          meetingList.length > 0
        ) {
          const firstMeeting =
            meetingList[0];

          setSelectedMeetingId(
            getMeetingId(
              firstMeeting,
              0
            )
          );
        }
      } catch (err) {
        console.error(
          "Failed to load reconciliation data:",
          err
        );

        setError(
          err.message ||
            "Failed to load reconciliation data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadMatchedMeetings();
  }, []);

  const statistics = useMemo(() => {
    const total =
      meetings.length;

    const high =
      meetings.filter(
        (meeting) =>
          getConfidencePercent(
            meeting.confidence
          ) >= 80
      ).length;

    const medium =
      meetings.filter((meeting) => {
        const confidence =
          getConfidencePercent(
            meeting.confidence
          );

        return (
          confidence >= 60 &&
          confidence < 80
        );
      }).length;

    const low =
      meetings.filter(
        (meeting) =>
          getConfidencePercent(
            meeting.confidence
          ) < 60
      ).length;

    const conflicts =
      meetings.filter(
        (meeting) =>
          Array.isArray(
            meeting.conflicts
          ) &&
          meeting.conflicts.length > 0
      ).length;

    return {
      total,
      high,
      medium,
      low,
      conflicts,
    };
  }, [meetings]);

  const filteredMeetings =
    useMemo(() => {
      const searchValue =
        search.trim().toLowerCase();

      return meetings.filter(
        (meeting, index) => {
          const meetingId =
            getMeetingId(
              meeting,
              index
            );

          const confidence =
            getConfidencePercent(
              meeting.confidence
            );

          if (
            confidenceFilter ===
              "HIGH" &&
            confidence < 80
          ) {
            return false;
          }

          if (
            confidenceFilter ===
              "MEDIUM" &&
            (
              confidence < 60 ||
              confidence >= 80
            )
          ) {
            return false;
          }

          if (
            confidenceFilter ===
              "LOW" &&
            confidence >= 60
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const searchableText = [
            meetingId,
            meeting.crm_id,
            meeting.calendar_id,
            meeting.title,
            meeting.client_name,
            meeting.company,
            meeting.location,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            searchValue
          );
        }
      );
    }, [
      meetings,
      search,
      confidenceFilter,
    ]);

  const selectedMeeting =
    useMemo(() => {
      if (!selectedMeetingId) {
        return null;
      }

      return (
        meetings.find(
          (meeting, index) =>
            getMeetingId(
              meeting,
              index
            ) === selectedMeetingId
        ) || null
      );
    }, [
      meetings,
      selectedMeetingId,
    ]);

  function handleMeetingSelect(
    meeting,
    index
  ) {
    const meetingId =
      getMeetingId(
        meeting,
        index
      );

    setSelectedMeetingId(
      meetingId
    );
  }

  return (
    <div className="reconciliation-page">

      <div className="reconciliation-header">

        <div>

          <div className="reconciliation-breadcrumb">
            Workspace / Reconciliation
          </div>

          <h1>
            Reconciliation
          </h1>

          <p>
            Review matched CRM and Calendar
            meetings, confidence and source
            provenance.
          </p>

        </div>

        <div className="reconciliation-header-status">

          <span className="reconciliation-header-dot"></span>

          <span>
            {statistics.total} matched meetings
          </span>

        </div>

      </div>


      <div className="reconciliation-summary">

        <div className="reconciliation-summary-card">

          <span className="summary-label">
            Matched Meetings
          </span>

          <strong>
            {statistics.total}
          </strong>

          <small>
            Successfully reconciled
          </small>

        </div>


        <div className="reconciliation-summary-card high-card">

          <span className="summary-label">
            High Confidence
          </span>

          <strong>
            {statistics.high}
          </strong>

          <small>
            80% and above
          </small>

        </div>


        <div className="reconciliation-summary-card medium-card">

          <span className="summary-label">
            Medium Confidence
          </span>

          <strong>
            {statistics.medium}
          </strong>

          <small>
            60% to 79%
          </small>

        </div>


        <div className="reconciliation-summary-card low-card">

          <span className="summary-label">
            Low Confidence
          </span>

          <strong>
            {statistics.low}
          </strong>

          <small>
            Below 60%
          </small>

        </div>


        <div className="reconciliation-summary-card conflict-card">

          <span className="summary-label">
            With Conflicts
          </span>

          <strong>
            {statistics.conflicts}
          </strong>

          <small>
            Require attention
          </small>

        </div>

      </div>


      <div className="reconciliation-toolbar">

        <div className="reconciliation-search">

          <span>
            🔍
          </span>

          <input
            type="text"
            value={search}
            placeholder="Search meeting, CRM ID, Calendar ID, client or company..."
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
            >
              ×
            </button>
          )}

        </div>


        <div className="reconciliation-filter">

          <label>
            Confidence
          </label>

          <select
            value={
              confidenceFilter
            }
            onChange={(event) =>
              setConfidenceFilter(
                event.target.value
              )
            }
          >

            <option value="ALL">
              All Confidence
            </option>

            <option value="HIGH">
              High
            </option>

            <option value="MEDIUM">
              Medium
            </option>

            <option value="LOW">
              Low
            </option>

          </select>

        </div>

      </div>


      {loading && (
        <div className="reconciliation-state">

          <div className="reconciliation-spinner"></div>

          <h3>
            Loading reconciliation results...
          </h3>

          <p>
            Retrieving matched CRM and Calendar
            meetings.
          </p>

        </div>
      )}


      {!loading &&
        error && (
          <div className="reconciliation-state reconciliation-error">

            <div className="reconciliation-state-icon">
              !
            </div>

            <h3>
              Unable to load reconciliation data
            </h3>

            <p>
              {error}
            </p>

          </div>
        )}


      {!loading &&
        !error &&
        filteredMeetings.length === 0 && (
          <div className="reconciliation-state">

            <div className="reconciliation-state-icon">
              ?
            </div>

            <h3>
              No matched meetings found
            </h3>

            <p>
              No meetings match the current
              search and confidence filters.
            </p>

          </div>
        )}


      {!loading &&
        !error &&
        filteredMeetings.length > 0 && (

          <div className="reconciliation-content">

            <div className="reconciliation-list-card">

              <div className="reconciliation-list-header">

                <div>
                  <h2>
                    Matched Meetings
                  </h2>

                  <p>
                    Select a meeting to inspect
                    reconciliation evidence.
                  </p>
                </div>

                <span className="reconciliation-count">
                  {filteredMeetings.length}
                </span>

              </div>


              <div className="reconciliation-list">

                {filteredMeetings.map(
                  (meeting) => {

                    const originalIndex =
                      meetings.indexOf(
                        meeting
                      );

                    const meetingId =
                      getMeetingId(
                        meeting,
                        originalIndex
                      );

                    const isSelected =
                      meetingId ===
                      selectedMeetingId;

                    const confidence =
                      getConfidencePercent(
                        meeting.confidence
                      );

                    const conflictCount =
                      Array.isArray(
                        meeting.conflicts
                      )
                        ? meeting.conflicts.length
                        : 0;

                    return (
                      <button
                        type="button"
                        key={meetingId}
                        className={
                          "reconciliation-list-item " +
                          (
                            isSelected
                              ? "selected"
                              : ""
                          )
                        }
                        onClick={() =>
                          handleMeetingSelect(
                            meeting,
                            originalIndex
                          )
                        }
                      >

                        <div className="meeting-item-top">

                          <div className="meeting-item-title">
                            {meeting.title ||
                              "Untitled Meeting"}
                          </div>

                          <ConfidenceBadge
                            confidence={
                              meeting.confidence
                            }
                          />

                        </div>


                        <div className="meeting-item-client">

                          {meeting.client_name ||
                            "Unknown client"}

                          {meeting.company && (
                            <span>
                              {" · "}
                              {meeting.company}
                            </span>
                          )}

                        </div>


                        <div className="meeting-item-meta">

                          <span>
                            {formatDate(
                              meeting.date
                            )}
                          </span>

                          <span>
                            {formatTime(
                              meeting.start_time
                            )}
                          </span>

                          <span>
                            {meeting.crm_id ||
                              "CRM —"}
                          </span>

                          <span>
                            {meeting.calendar_id ||
                              "CAL —"}
                          </span>

                        </div>


                        <div className="meeting-item-footer">

                          <StatusBadge
                            status={
                              meeting.match_status
                            }
                          />

                          {conflictCount > 0 && (
                            <span className="meeting-item-conflict">
                              {conflictCount} conflict
                              {conflictCount !== 1
                                ? "s"
                                : ""}
                            </span>
                          )}

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </div>


            <div className="reconciliation-detail">

              {!selectedMeeting && (
                <div className="reconciliation-detail-empty">

                  <div className="detail-empty-icon">
                    ↔
                  </div>

                  <h3>
                    Select a matched meeting
                  </h3>

                  <p>
                    Meeting reconciliation details
                    will appear here.
                  </p>

                </div>
              )}


              {selectedMeeting && (
                <>

                  <div className="meeting-detail-card">

                    <div className="meeting-detail-header">

                      <div>

                        <div className="meeting-detail-breadcrumb">
                          {selectedMeeting.crm_id ||
                            "CRM"}
                          {" ↔ "}
                          {selectedMeeting.calendar_id ||
                            "CAL"}
                        </div>

                        <h2>
                          {selectedMeeting.title ||
                            "Untitled Meeting"}
                        </h2>

                        <p>
                          {selectedMeeting.client_name ||
                            "Unknown client"}

                          {selectedMeeting.company && (
                            <>
                              {" · "}
                              {selectedMeeting.company}
                            </>
                          )}
                        </p>

                      </div>

                      <StatusBadge
                        status={
                          selectedMeeting.match_status
                        }
                      />

                    </div>


                    <div className="meeting-detail-stats">

                      <div className="detail-stat">

                        <span>
                          Confidence
                        </span>

                        <strong>
                          {getConfidencePercent(
                            selectedMeeting.confidence
                          )}
                          %
                        </strong>

                      </div>


                      <div className="detail-stat">

                        <span>
                          Date
                        </span>

                        <strong>
                          {formatDate(
                            selectedMeeting.date
                          )}
                        </strong>

                      </div>


                      <div className="detail-stat">

                        <span>
                          Start Time
                        </span>

                        <strong>
                          {formatTime(
                            selectedMeeting.start_time
                          )}
                        </strong>

                      </div>


                      <div className="detail-stat">

                        <span>
                          Location
                        </span>

                        <strong>
                          {formatValue(
                            selectedMeeting.location
                          )}
                        </strong>

                      </div>

                    </div>

                  </div>


                  <div className="evidence-card">

                    <div className="evidence-header">

                      <div>
                        <h2>
                          Match Evidence
                        </h2>

                        <p>
                          Signals used to determine
                          that the CRM and Calendar
                          records represent the same
                          meeting.
                        </p>
                      </div>

                      <ConfidenceBadge
                        confidence={
                          selectedMeeting.confidence
                        }
                      />

                    </div>


                    <div className="evidence-list">

                      {Array.isArray(
                        selectedMeeting.match_reasons
                      ) &&
                      selectedMeeting.match_reasons.length >
                        0 ? (

                        selectedMeeting.match_reasons.map(
                          (reason, index) => (
                            <MatchReason
                              key={
                                index +
                                "-" +
                                String(reason)
                              }
                              reason={reason}
                            />
                          )
                        )

                      ) : (
                        <div className="evidence-empty">
                          No match reasons were provided
                          by the reconciliation engine.
                        </div>
                      )}

                    </div>

                  </div>


                  <div className="source-comparison-card">

                    <div className="source-comparison-header">

                      <div>

                        <h2>
                          Source Comparison
                        </h2>

                        <p>
                          Original records used during
                          reconciliation.
                        </p>

                      </div>

                    </div>


                    <div className="source-comparison-grid">

                      <div className="source-panel crm-panel">

                        <div className="source-panel-header">

                          <span className="source-panel-badge crm">
                            CRM
                          </span>

                          <strong>
                            {selectedMeeting.crm_id ||
                              "Not available"}
                          </strong>

                        </div>

                        <div className="source-panel-content">

                          <div className="source-row">

                            <span>
                              Subject
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.subject
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Client
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.client_name
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Company
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.client_company
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Date
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.meeting_date
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Time
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.meeting_time
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Location
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.location
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Status
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.crm
                                  ?.status
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>


                      <div className="source-panel calendar-panel">

                        <div className="source-panel-header">

                          <span className="source-panel-badge calendar">
                            CALENDAR
                          </span>

                          <strong>
                            {selectedMeeting.calendar_id ||
                              "Not available"}
                          </strong>

                        </div>

                        <div className="source-panel-content">

                          <div className="source-row">

                            <span>
                              Title
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.title
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Organizer
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.organizer
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Start
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.start_time
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              End
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.end_time
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Location
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.location
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Attendees
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.attendees
                              )}
                            </strong>

                          </div>

                          <div className="source-row">

                            <span>
                              Status
                            </span>

                            <strong>
                              {formatValue(
                                selectedMeeting
                                  .sources?.calendar
                                  ?.status
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>


                  <ProvenanceTable
                    meeting={
                      selectedMeeting
                    }
                  />


                  <div className="conflict-detail-card">

                    <div className="conflict-detail-header">

                      <div>

                        <h2>
                          Conflicts
                        </h2>

                        <p>
                          Field-level differences detected
                          between the source systems.
                        </p>

                      </div>

                      <span className="conflict-detail-count">

                        {Array.isArray(
                          selectedMeeting.conflicts
                        )
                          ? selectedMeeting.conflicts.length
                          : 0}

                      </span>

                    </div>


                    {!Array.isArray(
                      selectedMeeting.conflicts
                    ) ||
                    selectedMeeting.conflicts.length ===
                      0 ? (

                      <div className="no-conflicts">
                        <span>
                          ✓
                        </span>

                        <div>
                          <strong>
                            No conflicts detected
                          </strong>

                          <p>
                            CRM and Calendar values are
                            consistent for this meeting.
                          </p>
                        </div>
                      </div>

                    ) : (

                      <div className="conflict-detail-list">

                        {selectedMeeting.conflicts.map(
                          (conflict, index) => (

                            <div
                              className="conflict-detail-item"
                              key={
                                conflict.field +
                                "-" +
                                index
                              }
                            >

                              <div className="conflict-field">

                                {conflict.field ||
                                  "Unknown field"}

                              </div>

                              <div className="conflict-values">

                                <div>

                                  <span className="conflict-value-label">
                                    CRM
                                  </span>

                                  <span>
                                    {formatValue(
                                      conflict.crm_value
                                    )}
                                  </span>

                                </div>

                                <div>

                                  <span className="conflict-value-label calendar-label">
                                    Calendar
                                  </span>

                                  <span>
                                    {formatValue(
                                      conflict.calendar_value
                                    )}
                                  </span>

                                </div>

                              </div>

                              <div>

                                <span
                                  className={
                                    "conflict-severity " +
                                    String(
                                      conflict.severity ||
                                        "INFO"
                                    ).toLowerCase()
                                  }
                                >
                                  {String(
                                    conflict.severity ||
                                      "INFO"
                                  ).toUpperCase()}
                                </span>

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </>
              )}

            </div>

          </div>
        )}

    </div>
  );
}

export default Reconciliation;