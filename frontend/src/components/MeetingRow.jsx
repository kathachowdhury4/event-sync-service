import StatusBadge
  from "./StatusBadge";

import ConfidenceBadge
  from "./ConfidenceBadge";

import ConflictBadge
  from "./ConflictBadge";


function formatDate(
  value
) {

  if (!value) {
    return "—";
  }

  try {

    return new Date(
      value
    ).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );

  } catch {

    return value;
  }
}


function MeetingRow({
  meeting,
  onSelect
}) {

  return (
    <tr
      onClick={() =>
        onSelect(meeting)
      }
      className="meeting-row"
    >

      <td>

        <div className="meeting-title">
          {meeting.title ||
            "Untitled Meeting"}
        </div>

        <div className="meeting-company">
          {meeting.company ||
            "Internal / Unknown"}
        </div>

      </td>


      <td>
        {formatDate(
          meeting.date
        )}
      </td>


      <td>
        {meeting.client_name ||
          "—"}
      </td>


      <td>
        <StatusBadge
          status={
            meeting.match_status
          }
        />
      </td>


      <td>
        <ConfidenceBadge
          confidence={
            meeting.confidence
          }
        />
      </td>


      <td>
        <ConflictBadge
          count={
            meeting.conflicts?.length ||
            0
          }
        />
      </td>


      <td>

        <div className="source-list">

          {meeting.crm_id && (
            <span className="source-badge crm">
              CRM
            </span>
          )}

          {meeting.calendar_id && (
            <span className="source-badge calendar">
              Calendar
            </span>
          )}

        </div>

      </td>

    </tr>
  );
}

export default MeetingRow;