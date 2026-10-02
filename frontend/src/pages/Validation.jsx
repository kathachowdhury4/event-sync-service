import React, { useEffect, useMemo, useState } from "react";
import { getMeetings } from "../services/api";
import "./Validation.css";

function getMeetingId(meeting, index) {
  return (
    meeting.meeting_id ||
    meeting.id ||
    meeting.crm_id ||
    meeting.calendar_id ||
    "MEETING-" + (index + 1)
  );
}

function getValidationIssues(meeting, index) {
  if (!Array.isArray(meeting.validation_issues)) {
    return [];
  }

  const meetingId = getMeetingId(meeting, index);

  return meeting.validation_issues.map((issue, issueIndex) => ({
    ...issue,
    meeting_id: meetingId,
    source:
      issue.source ||
      (meeting.crm_id ? "CRM" : "Calendar"),
    record_id:
      issue.record_id ||
      meeting.crm_id ||
      meeting.calendar_id ||
      meetingId,
    issue_key: meetingId + "-" + issueIndex,
  }));
}

function getSeverityClass(severity) {
  const value = String(severity || "ERROR").toUpperCase();

  if (value === "WARNING") {
    return "warning";
  }

  if (value === "INFO") {
    return "info";
  }

  return "error";
}

function SeverityBadge({ severity }) {
  const value = String(severity || "ERROR").toUpperCase();

  return (
    <span
      className={
        "validation-severity " +
        getSeverityClass(value)
      }
    >
      {value}
    </span>
  );
}

function Validation() {
  const [meetings, setMeetings] = useState([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoading(true);
        setError("");

        const data = await getMeetings();

        const meetingList = Array.isArray(data)
          ? data
          : Array.isArray(data.meetings)
            ? data.meetings
            : [];

        setMeetings(meetingList);
      } catch (err) {
        console.error(
          "Failed to load validation data:",
          err
        );

        setError(
          err.message ||
            "Failed to load validation data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  const issues = useMemo(() => {
    return meetings.flatMap(
      (meeting, index) =>
        getValidationIssues(meeting, index)
    );
  }, [meetings]);

  const counts = useMemo(() => {
    return {
      total: issues.length,

      errors: issues.filter(
        (issue) =>
          String(
            issue.severity || "ERROR"
          ).toUpperCase() === "ERROR"
      ).length,

      warnings: issues.filter(
        (issue) =>
          String(
            issue.severity || ""
          ).toUpperCase() === "WARNING"
      ).length,

      crm: issues.filter(
        (issue) =>
          String(issue.source).toUpperCase() ===
          "CRM"
      ).length,

      calendar: issues.filter(
        (issue) =>
          String(issue.source).toUpperCase() ===
          "CALENDAR"
      ).length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return issues.filter((issue) => {
      const source =
        String(issue.source || "").toUpperCase();

      const severity =
        String(
          issue.severity || "ERROR"
        ).toUpperCase();

      if (
        sourceFilter !== "ALL" &&
        source !== sourceFilter
      ) {
        return false;
      }

      if (
        severityFilter !== "ALL" &&
        severity !== severityFilter
      ) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const searchableText = [
        issue.meeting_id,
        issue.record_id,
        issue.source,
        issue.field,
        issue.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        searchValue
      );
    });
  }, [
    issues,
    search,
    sourceFilter,
    severityFilter,
  ]);

  return (
    <div className="validation-page">

      <div className="validation-header">

        <div>
          <div className="validation-breadcrumb">
            Workspace / Validation
          </div>

          <h1>
            Validation
          </h1>

          <p>
            Review data quality issues detected
            during event ingestion and
            normalization.
          </p>
        </div>

        <div
          className={
            "validation-status " +
            (counts.total === 0
              ? "healthy"
              : "attention")
          }
        >
          <span className="validation-status-dot"></span>

          {counts.total === 0
            ? "Validation Passed"
            : counts.total + " Issue" +
              (counts.total !== 1
                ? "s"
                : "") +
              " Detected"}
        </div>

      </div>

      {/* Summary cards */}

      <div className="validation-summary">

        <button
          className={
            "validation-card " +
            (severityFilter === "ALL" &&
            sourceFilter === "ALL"
              ? "selected"
              : "")
          }
          onClick={() => {
            setSeverityFilter("ALL");
            setSourceFilter("ALL");
          }}
        >
          <span className="validation-card-label">
            Total Issues
          </span>

          <strong>
            {counts.total}
          </strong>

          <small>
            Across all records
          </small>
        </button>

        <button
          className={
            "validation-card error-card " +
            (severityFilter === "ERROR"
              ? "selected"
              : "")
          }
          onClick={() => {
            setSeverityFilter("ERROR");
            setSourceFilter("ALL");
          }}
        >
          <span className="validation-card-label">
            Errors
          </span>

          <strong>
            {counts.errors}
          </strong>

          <small>
            Requires attention
          </small>
        </button>

        <button
          className={
            "validation-card warning-card " +
            (severityFilter === "WARNING"
              ? "selected"
              : "")
          }
          onClick={() => {
            setSeverityFilter("WARNING");
            setSourceFilter("ALL");
          }}
        >
          <span className="validation-card-label">
            Warnings
          </span>

          <strong>
            {counts.warnings}
          </strong>

          <small>
            Review recommended
          </small>
        </button>

        <button
          className={
            "validation-card source-card " +
            (sourceFilter === "CRM"
              ? "selected"
              : "")
          }
          onClick={() => {
            setSourceFilter("CRM");
            setSeverityFilter("ALL");
          }}
        >
          <span className="validation-card-label">
            CRM Issues
          </span>

          <strong>
            {counts.crm}
          </strong>

          <small>
            Records from CRM
          </small>
        </button>

        <button
          className={
            "validation-card source-card " +
            (sourceFilter === "CALENDAR"
              ? "selected"
              : "")
          }
          onClick={() => {
            setSourceFilter("CALENDAR");
            setSeverityFilter("ALL");
          }}
        >
          <span className="validation-card-label">
            Calendar Issues
          </span>

          <strong>
            {counts.calendar}
          </strong>

          <small>
            Records from Calendar
          </small>
        </button>

      </div>

      {/* Toolbar */}

      <div className="validation-toolbar">

        <div className="validation-search">

          <span>
            🔍
          </span>

          <input
            type="text"
            placeholder="Search record, field or validation message..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}

        </div>

        <div className="validation-filters">

          <label>
            Source
          </label>

          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Sources
            </option>

            <option value="CRM">
              CRM
            </option>

            <option value="CALENDAR">
              Calendar
            </option>
          </select>

          <label>
            Severity
          </label>

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Severities
            </option>

            <option value="ERROR">
              Error
            </option>

            <option value="WARNING">
              Warning
            </option>

            <option value="INFO">
              Info
            </option>
          </select>

        </div>

      </div>

      {/* Loading */}

      {loading && (
        <div className="validation-state">
          <div className="validation-spinner"></div>

          <h3>
            Running validation report...
          </h3>

          <p>
            Loading validation results from
            the backend.
          </p>
        </div>
      )}

      {/* Error */}

      {!loading && error && (
        <div className="validation-state validation-error-state">

          <div className="validation-state-icon">
            !
          </div>

          <h3>
            Unable to load validation data
          </h3>

          <p>
            {error}
          </p>

        </div>
      )}

      {/* No issues */}

      {!loading &&
        !error &&
        filteredIssues.length === 0 && (
          <div className="validation-state validation-success-state">

            <div className="validation-success-icon">
              ✓
            </div>

            <h3>
              No validation issues found
            </h3>

            <p>
              All records passed the current
              validation filters.
            </p>

          </div>
        )}

      {/* Issues table */}

      {!loading &&
        !error &&
        filteredIssues.length > 0 && (

          <div className="validation-table-card">

            <div className="validation-table-header">

              <div>
                <h2>
                  Validation Issues
                </h2>

                <p>
                  Data quality findings from
                  CRM and Calendar records
                </p>
              </div>

              <div className="validation-record-count">
                {filteredIssues.length} issue
                {filteredIssues.length !== 1
                  ? "s"
                  : ""}
              </div>

            </div>

            <div className="validation-table-wrapper">

              <table className="validation-table">

                <thead>
                  <tr>
                    <th>
                      Source
                    </th>

                    <th>
                      Record ID
                    </th>

                    <th>
                      Field
                    </th>

                    <th>
                      Validation Issue
                    </th>

                    <th>
                      Severity
                    </th>

                    <th>
                      Meeting
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredIssues.map(
                    (issue) => (
                      <tr
                        key={
                          issue.issue_key
                        }
                      >

                        <td>
                          <span
                            className={
                              "validation-source " +
                              String(
                                issue.source
                              ).toLowerCase()
                            }
                          >
                            {issue.source}
                          </span>
                        </td>

                        <td>
                          <span className="validation-record-id">
                            {issue.record_id}
                          </span>
                        </td>

                        <td>
                          <span className="validation-field">
                            {issue.field || "—"}
                          </span>
                        </td>

                        <td>
                          <div className="validation-message">
                            {issue.message ||
                              "Validation issue detected"}
                          </div>
                        </td>

                        <td>
                          <SeverityBadge
                            severity={
                              issue.severity
                            }
                          />
                        </td>

                        <td>
                          <span className="validation-meeting-id">
                            {issue.meeting_id}
                          </span>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

    </div>
  );
}

export default Validation;