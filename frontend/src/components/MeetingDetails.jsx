import StatusBadge
  from "./StatusBadge";

import ConfidenceBadge
  from "./ConfidenceBadge";


function MeetingDetails({
  meeting,
  onClose
}) {

  if (!meeting) {
    return null;
  }


  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="details-panel"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="details-header">

          <div>

            <h2>
              {meeting.title ||
                "Meeting Details"}
            </h2>

            <p>
              {meeting.meeting_id}
            </p>

          </div>


          <button
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        <div className="details-status-row">

          <StatusBadge
            status={
              meeting.match_status
            }
          />

          <ConfidenceBadge
            confidence={
              meeting.confidence
            }
          />

        </div>


        <section className="detail-section">

          <h3>
            Meeting Information
          </h3>


          <div className="detail-grid">

            <DetailItem
              label="Date"
              value={
                meeting.date
              }
            />

            <DetailItem
              label="Start"
              value={
                meeting.start_time
              }
            />

            <DetailItem
              label="End"
              value={
                meeting.end_time
              }
            />

            <DetailItem
              label="Client"
              value={
                meeting.client_name
              }
            />

            <DetailItem
              label="Company"
              value={
                meeting.company
              }
            />

            <DetailItem
              label="Organizer"
              value={
                meeting.organizer
              }
            />

            <DetailItem
              label="Location"
              value={
                meeting.location
              }
            />

            <DetailItem
              label="Status"
              value={
                meeting.status
              }
            />

          </div>

        </section>


        <section className="detail-section">

          <h3>
            Source Records
          </h3>


          <div className="source-records">

            <SourceRecord
              label="CRM"
              id={
                meeting.crm_id
              }
              data={
                meeting.sources?.crm
              }
            />


            <SourceRecord
              label="Calendar"
              id={
                meeting.calendar_id
              }
              data={
                meeting.sources?.calendar
              }
            />

          </div>

        </section>


        <section className="detail-section">

          <h3>
            Why These Records Were Matched
          </h3>


          {meeting.match_reasons?.length ? (

            <ul className="reason-list">

              {meeting.match_reasons.map(
                (reason, index) => (

                  <li key={index}>
                    {reason}
                  </li>

                )
              )}

            </ul>

          ) : (

            <p className="muted">
              No match reason available.
            </p>

          )}

        </section>


        {meeting.conflicts?.length > 0 && (

          <section className="detail-section">

            <h3 className="conflict-heading">
              Conflicts
            </h3>


            <div className="conflict-list">

              {meeting.conflicts.map(
                (conflict, index) => (

                  <div
                    className="conflict-item"
                    key={index}
                  >

                    <div className="conflict-field">
                      {conflict.field}
                    </div>

                    <div className="conflict-values">

                      <div>
                        <strong>
                          CRM:
                        </strong>

                        <span>
                          {String(
                            conflict.crm_value ??
                            "—"
                          )}
                        </span>
                      </div>


                      <div>
                        <strong>
                          Calendar:
                        </strong>

                        <span>
                          {String(
                            conflict.calendar_value ??
                            "—"
                          )}
                        </span>
                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        )}


        {meeting.validation_issues?.length > 0 && (

          <section className="detail-section">

            <h3 className="warning-heading">
              Validation Warnings
            </h3>


            <div className="warning-list">

              {meeting.validation_issues.map(
                (issue, index) => (

                  <div
                    className="warning-item"
                    key={index}
                  >

                    <strong>
                      {issue.field}
                    </strong>

                    <span>
                      {issue.message}
                    </span>

                  </div>

                )
              )}

            </div>

          </section>

        )}

      </div>

    </div>
  );
}


function DetailItem({
  label,
  value
}) {

  return (
    <div className="detail-item">

      <span className="detail-label">
        {label}
      </span>

      <span className="detail-value">
        {value || "—"}
      </span>

    </div>
  );
}


function SourceRecord({
  label,
  id,
  data
}) {

  return (
    <div className="source-record">

      <div className="source-record-header">

        <strong>
          {label}
        </strong>

        <span>
          {id || "No matching record"}
        </span>

      </div>


      {data ? (

        <pre>
          {JSON.stringify(
            data,
            null,
            2
          )}
        </pre>

      ) : (

        <div className="source-missing">
          No record from this source.
        </div>

      )}

    </div>
  );
}


export default MeetingDetails;