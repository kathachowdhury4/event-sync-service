import MeetingRow
  from "./MeetingRow";


function MeetingTable({
  meetings,
  loading,
  onSelect
}) {

  if (loading) {

    return (
      <div className="table-container">

        <div className="loading-message">
          Loading reconciled meetings...
        </div>

      </div>
    );
  }


  if (!meetings.length) {

    return (
      <div className="empty-state">

        <div className="empty-icon">
          📅
        </div>

        <h3>
          No meetings found
        </h3>

        <p>
          Try changing the filters.
        </p>

      </div>
    );
  }


  return (
    <div className="table-container">

      <table>

        <thead>

          <tr>

            <th>
              Meeting
            </th>

            <th>
              Date
            </th>

            <th>
              Client
            </th>

            <th>
              Reconciliation
            </th>

            <th>
              Confidence
            </th>

            <th>
              Conflicts
            </th>

            <th>
              Sources
            </th>

          </tr>

        </thead>


        <tbody>

          {meetings.map(
            (meeting) => (

              <MeetingRow
                key={
                  meeting.meeting_id
                }
                meeting={meeting}
                onSelect={onSelect}
              />

            )
          )}

        </tbody>

      </table>

    </div>
  );
}

export default MeetingTable;