import React from "react";
import "./ProvenanceTable.css";

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

function normalizeSource(source) {
  if (!source) {
    return "UNKNOWN";
  }

  return String(source).toUpperCase();
}

function SourceBadge({ source }) {
  const normalizedSource =
    normalizeSource(source);

  return (
    <span
      className={
        "provenance-source " +
        normalizedSource.toLowerCase()
      }
    >
      {normalizedSource}
    </span>
  );
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}

function ProvenanceTable({ meeting }) {
  if (!meeting) {
    return null;
  }

  const crm =
    meeting.sources?.crm || {};

  const calendar =
    meeting.sources?.calendar || {};

  const fields = [
    {
      key: "title",
      label: "Title",
      unifiedValue: meeting.title,
      crmField: "subject",
      calendarField: "title",
    },

    {
      key: "client_name",
      label: "Client",
      unifiedValue: meeting.client_name,
      crmField: "client_name",
      calendarField: null,
    },

    {
      key: "company",
      label: "Company",
      unifiedValue: meeting.company,
      crmField: "client_company",
      calendarField: null,
    },

    {
      key: "date",
      label: "Date",
      unifiedValue: meeting.date,
      crmField: "meeting_date",
      calendarField: "start_time",
    },

    {
      key: "start_time",
      label: "Start Time",
      unifiedValue: meeting.start_time,
      crmField: "meeting_time",
      calendarField: "start_time",
    },

    {
      key: "end_time",
      label: "End Time",
      unifiedValue: meeting.end_time,
      crmField: null,
      calendarField: "end_time",
    },

    {
      key: "location",
      label: "Location",
      unifiedValue: meeting.location,
      crmField: "location",
      calendarField: "location",
    },

    {
      key: "status",
      label: "Status",
      unifiedValue: meeting.status,
      crmField: "status",
      calendarField: "status",
    },

    {
      key: "meeting_type",
      label: "Meeting Type",
      unifiedValue: meeting.meeting_type,
      crmField: "meeting_type",
      calendarField: null,
    },

    {
      key: "organizer",
      label: "Organizer",
      unifiedValue: meeting.organizer,
      crmField: "relationship_owner",
      calendarField: "organizer",
    },

    {
      key: "attendees",
      label: "Attendees",
      unifiedValue: meeting.attendees,
      crmField: null,
      calendarField: "attendees",
    },
  ];

  function getSources(field) {
    const sources = [];

    if (
      field.crmField &&
      hasValue(crm[field.crmField])
    ) {
      sources.push("CRM");
    }

    if (
      field.calendarField &&
      hasValue(calendar[field.calendarField])
    ) {
      sources.push("CALENDAR");
    }

    return sources;
  }

  function isConflict(fieldKey) {
    if (!Array.isArray(meeting.conflicts)) {
      return false;
    }

    return meeting.conflicts.some(
      (conflict) =>
        String(conflict.field || "")
          .toLowerCase() ===
        String(fieldKey).toLowerCase()
    );
  }

  return (
    <div className="provenance-card">

      <div className="provenance-header">

        <div>
          <div className="provenance-title-row">

            <h2>
              Field-Level Provenance
            </h2>

            <span className="provenance-count">
              {fields.length} fields
            </span>

          </div>

          <p>
            Unified values with their original
            CRM and Calendar source information.
          </p>
        </div>

        <div className="provenance-legend">

          <SourceBadge source="CRM" />

          <SourceBadge source="CALENDAR" />

        </div>

      </div>

      <div className="provenance-info">

        <span className="provenance-info-icon">
          i
        </span>

        <span>
          Source values are preserved so that
          reconciliation decisions remain
          explainable and auditable.
        </span>

      </div>

      <div className="provenance-table-wrapper">

        <table className="provenance-table">

          <thead>

            <tr>

              <th>
                Field
              </th>

              <th>
                Unified Value
              </th>

              <th>
                Source
              </th>

              <th>
                CRM Value
              </th>

              <th>
                Calendar Value
              </th>

            </tr>

          </thead>

          <tbody>

            {fields.map((field) => {

              const sources =
                getSources(field);

              const crmValue =
                field.crmField
                  ? crm[field.crmField]
                  : null;

              const calendarValue =
                field.calendarField
                  ? calendar[field.calendarField]
                  : null;

              const conflict =
                isConflict(field.key);

              return (
                <tr
                  key={field.key}
                  className={
                    conflict
                      ? "provenance-conflict-row"
                      : ""
                  }
                >

                  <td>

                    <div className="provenance-field-cell">

                      <span className="provenance-field">
                        {field.label}
                      </span>

                      {conflict && (
                        <span className="provenance-conflict">
                          CONFLICT
                        </span>
                      )}

                    </div>

                  </td>

                  <td>

                    <div className="provenance-unified-value">

                      {formatValue(
                        field.unifiedValue
                      )}

                    </div>

                  </td>

                  <td>

                    <div className="provenance-source-list">

                      {sources.length === 0 ? (
                        <SourceBadge
                          source="UNKNOWN"
                        />
                      ) : (
                        sources.map(
                          (source) => (
                            <SourceBadge
                              key={source}
                              source={source}
                            />
                          )
                        )
                      )}

                    </div>

                  </td>

                  <td>

                    <div className="provenance-original-value">

                      {formatValue(
                        crmValue
                      )}

                    </div>

                  </td>

                  <td>

                    <div className="provenance-original-value">

                      {formatValue(
                        calendarValue
                      )}

                    </div>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      <div className="provenance-footer">

        <div className="provenance-footer-item">

          <span className="provenance-footer-dot crm-dot"></span>

          <span>
            CRM indicates the value originated
            from the CRM record.
          </span>

        </div>

        <div className="provenance-footer-item">

          <span className="provenance-footer-dot calendar-dot"></span>

          <span>
            Calendar indicates the value originated
            from the calendar event.
          </span>

        </div>

        <div className="provenance-footer-item">

          <span className="provenance-footer-dot conflict-dot"></span>

          <span>
            Conflict indicates that source values
            differ.
          </span>

        </div>

      </div>

    </div>
  );
}

export default ProvenanceTable;