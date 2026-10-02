import React, { useEffect, useState } from "react";
import {
BrowserRouter,
Routes,
Route,
Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";

import {
getReconciliationSummary,
getMeetings,
getConflictMeetings,
getHealth,
} from "./services/api";

import Validation from "./pages/Validation";
import ReconciliationPage from "./pages/Reconciliation";
import ReviewQueue from "./pages/ReviewQueue";
import DuplicateExplorer from "./pages/DuplicateExplorer";

import "./App.css";

/* =========================================================
HELPER FUNCTIONS
========================================================= */

function formatDateTime(value) {
if (!value || value === "-") {
return "-";
}

try {
const date = new Date(value);


if (Number.isNaN(date.getTime())) {
  return String(value);
}

return date.toLocaleString();


} catch (error) {
return String(value);
}
}

function getMeetingId(meeting, index) {
return (
meeting.meeting_id ||
meeting.id ||
meeting.reconciled_id ||
meeting.reconciliation_id ||
"MEETING-" + (index + 1)
);
}

function getMeetingTitle(meeting) {
return (
meeting.title ||
meeting.subject ||
meeting.name ||
meeting.crm_title ||
meeting.calendar_title ||
"Untitled Meeting"
);
}

function getStartTime(meeting) {
return (
meeting.start_time ||
meeting.start ||
meeting.crm_start_time ||
meeting.calendar_start_time ||
"-"
);
}

function getEndTime(meeting) {
return (
meeting.end_time ||
meeting.end ||
meeting.crm_end_time ||
meeting.calendar_end_time ||
"-"
);
}

function getMatchStatus(meeting) {
return (
meeting.match_status ||
meeting.status ||
meeting.reconciliation_status ||
"UNKNOWN"
);
}

function getConflictCount(meeting) {
const conflicts =
meeting.conflicts ||
meeting.conflict_fields ||
meeting.conflicting_fields ||
[];

if (Array.isArray(conflicts)) {
return conflicts.length;
}

if (typeof conflicts === "number") {
return conflicts;
}

if (conflicts) {
return 1;
}

return 0;
}

/* =========================================================
STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
const normalizedStatus =
String(status || "UNKNOWN").toUpperCase();

let className = "status-badge unknown";

if (normalizedStatus === "MATCHED") {
className = "status-badge matched";
} else if (normalizedStatus === "CRM_ONLY") {
className = "status-badge crm-only";
} else if (normalizedStatus === "CALENDAR_ONLY") {
className = "status-badge calendar-only";
} else if (
normalizedStatus === "CONFLICT" ||
normalizedStatus === "CONFLICTS"
) {
className = "status-badge conflict";
}

return ( <span className={className}>
{normalizedStatus.replace(/_/g, " ")} </span>
);
}

/* =========================================================
DASHBOARD
========================================================= */

function Dashboard() {
const [summary, setSummary] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadSummary() {
try {
setLoading(true);
setError("");


  console.log(
    "Calling reconciliation summary API..."
  );

  const data = await getReconciliationSummary();

  console.log(
    "Reconciliation summary received:",
    data
  );

  setSummary(data);
} catch (err) {
  console.error(
    "Failed to load reconciliation summary:",
    err
  );

  setError(
    err.message ||
      "Failed to load dashboard data"
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
loadSummary();
}, []);

if (loading) {
return ( <div className="page"> <div className="page-header"> <h1>
Dashboard </h1>


      <p>
        Event Sync Service overview
      </p>
    </div>

    <div className="loading-message">
      Loading reconciliation summary...
    </div>
  </div>
);


}

if (error) {
return ( <div className="page"> <div className="page-header"> <h1>
Dashboard </h1>


      <p>
        Event Sync Service overview
      </p>
    </div>

    <div className="error-box">
      <strong>
        Unable to load dashboard
      </strong>

      <p>
        {error}
      </p>

      <button onClick={loadSummary}>
        Retry
      </button>
    </div>
  </div>
);


}

if (!summary) {
return ( <div className="page"> <div className="page-header"> <h1>
Dashboard </h1>


      <p>
        Event Sync Service overview
      </p>
    </div>

    <div className="empty-state">
      <h2>
        No dashboard data
      </h2>

      <p>
        No reconciliation summary was returned
        by the API.
      </p>
    </div>
  </div>
);


}

return ( <div className="page">


  <div className="page-header">
    <h1>
      Dashboard
    </h1>

    <p>
      Event Sync Service overview
    </p>
  </div>

  {/* SOURCE RECORDS */}

  <section className="dashboard-section">

    <h2>
      Source Records
    </h2>

    <div className="stats-grid">

      <div className="stat-card">

        <div className="stat-title">
          CRM Records
        </div>

        <div className="stat-value">
          {summary.total_crm_records}
        </div>

        <div className="stat-description">
          Records received from CRM
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Calendar Records
        </div>

        <div className="stat-value">
          {summary.total_calendar_records}
        </div>

        <div className="stat-description">
          Records received from Calendar
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Matched Meetings
        </div>

        <div className="stat-value">
          {summary.matched}
        </div>

        <div className="stat-description">
          Records successfully reconciled
        </div>

      </div>

    </div>

  </section>

  {/* RECONCILIATION */}

  <section className="dashboard-section">

    <h2>
      Reconciliation Results
    </h2>

    <div className="stats-grid">

      <div className="stat-card">

        <div className="stat-title">
          CRM Only
        </div>

        <div className="stat-value">
          {summary.crm_only}
        </div>

        <div className="stat-description">
          Meetings found only in CRM
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Calendar Only
        </div>

        <div className="stat-value">
          {summary.calendar_only}
        </div>

        <div className="stat-description">
          Meetings found only in Calendar
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Conflicts
        </div>

        <div className="stat-value">
          {summary.conflicts}
        </div>

        <div className="stat-description">
          Meetings containing conflicting fields
        </div>

      </div>

    </div>

  </section>

  {/* DATA QUALITY */}

  <section className="dashboard-section">

    <h2>
      Data Quality
    </h2>

    <div className="stats-grid">

      <div className="stat-card">

        <div className="stat-title">
          Possible Duplicates
        </div>

        <div className="stat-value">
          {summary.possible_duplicates}
        </div>

        <div className="stat-description">
          Potential duplicate records
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Validation Issues
        </div>

        <div className="stat-value">
          {summary.validation_issues}
        </div>

        <div className="stat-description">
          Records with validation problems
        </div>

      </div>

    </div>

  </section>

  {/* OVERVIEW */}

  <section className="dashboard-section">

    <h2>
      Reconciliation Overview
    </h2>

    <div className="overview-card">

      <p>
        The system processed{" "}
        <strong>
          {summary.total_crm_records}
        </strong>{" "}
        CRM records and{" "}
        <strong>
          {summary.total_calendar_records}
        </strong>{" "}
        Calendar records.
      </p>

      <p>
        <strong>
          {summary.matched}
        </strong>{" "}
        records were matched across the two
        sources.
      </p>

      <p>
        <strong>
          {summary.crm_only}
        </strong>{" "}
        records were found only in CRM, while{" "}
        <strong>
          {summary.calendar_only}
        </strong>{" "}
        were found only in Calendar.
      </p>

      <p>
        <strong>
          {summary.conflicts}
        </strong>{" "}
        reconciliation conflicts were detected.
      </p>

    </div>

  </section>

</div>


);
}

/* =========================================================
ALL MEETINGS
========================================================= */

function AllMeetings() {
const [meetings, setMeetings] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadMeetings() {
try {
setLoading(true);
setError("");


  console.log(
    "Calling meetings API..."
  );

  const data = await getMeetings();

  console.log(
    "Meetings API response:",
    data
  );

  let meetingList = [];

  if (Array.isArray(data)) {
    meetingList = data;
  } else if (
    data &&
    Array.isArray(data.meetings)
  ) {
    meetingList = data.meetings;
  }

  setMeetings(meetingList);
} catch (err) {
  console.error(
    "Failed to load meetings:",
    err
  );

  setError(
    err.message ||
      "Failed to load meetings"
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
loadMeetings();
}, []);

if (loading) {
return ( <div className="page">


    <div className="page-header">

      <h1>
        All Meetings
      </h1>

      <p>
        Reconciled meetings from CRM and Calendar.
      </p>

    </div>

    <div className="loading-message">
      Loading meetings...
    </div>

  </div>
);


}

if (error) {
return ( <div className="page">


    <div className="page-header">

      <h1>
        All Meetings
      </h1>

      <p>
        Reconciled meetings from CRM and Calendar.
      </p>

    </div>

    <div className="error-box">

      <strong>
        Unable to load meetings
      </strong>

      <p>
        {error}
      </p>

      <button onClick={loadMeetings}>
        Retry
      </button>

    </div>

  </div>
);


}

return ( <div className="page">


  <div className="page-header">

    <h1>
      All Meetings
    </h1>

    <p>
      Reconciled meetings from CRM and Calendar.
    </p>

  </div>

  <div className="meeting-summary-bar">

    <div>

      <span className="summary-label">
        Total Meetings
      </span>

      <strong>
        {meetings.length}
      </strong>

    </div>

    <button
      className="refresh-button"
      onClick={loadMeetings}
    >
      Refresh
    </button>

  </div>

  {meetings.length === 0 ? (

    <div className="empty-state">

      <div className="empty-icon">
        📅
      </div>

      <h2>
        No meetings found
      </h2>

      <p>
        The API returned no meeting records.
      </p>

    </div>

  ) : (

    <div className="meetings-table-container">

      <table className="meetings-table">

        <thead>

          <tr>

            <th>
              Meeting ID
            </th>

            <th>
              Title
            </th>

            <th>
              Start Time
            </th>

            <th>
              End Time
            </th>

            <th>
              Match Status
            </th>

            <th>
              Conflicts
            </th>

          </tr>

        </thead>

        <tbody>

          {meetings.map(
            function (meeting, index) {

              const meetingId =
                getMeetingId(
                  meeting,
                  index
                );

              const title =
                getMeetingTitle(
                  meeting
                );

              const startTime =
                getStartTime(
                  meeting
                );

              const endTime =
                getEndTime(
                  meeting
                );

              const status =
                getMatchStatus(
                  meeting
                );

              const conflictCount =
                getConflictCount(
                  meeting
                );

              return (
                <tr
                  key={
                    meetingId +
                    "-" +
                    index
                  }
                >

                  <td>

                    <strong className="meeting-id">
                      {meetingId}
                    </strong>

                  </td>

                  <td>
                    {title}
                  </td>

                  <td>
                    {formatDateTime(
                      startTime
                    )}
                  </td>

                  <td>
                    {formatDateTime(
                      endTime
                    )}
                  </td>

                  <td>

                    <StatusBadge
                      status={status}
                    />

                  </td>

                  <td>

                    {conflictCount > 0 ? (

                      <span className="conflict-badge">
                        {conflictCount}
                      </span>

                    ) : (

                      <span className="no-conflict">
                        None
                      </span>

                    )}

                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>

  )}

</div>


);
}

/* =========================================================
CONFLICTS
========================================================= */

function Conflicts() {
const [meetings, setMeetings] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadData() {
try {
setLoading(true);
setError("");


  const data = await getConflictMeetings();

  let list = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (
    data &&
    Array.isArray(data.meetings)
  ) {
    list = data.meetings;
  }

  setMeetings(list);
} catch (err) {
  setError(
    err.message ||
      "Failed to load conflicts"
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
loadData();
}, []);

return ( <div className="page">


  <div className="page-header">

    <h1>
      Conflicts
    </h1>

    <p>
      Meetings where CRM and Calendar contain
      conflicting information.
    </p>

  </div>

  {loading && (
    <div className="loading-message">
      Loading conflicts...
    </div>
  )}

  {error && (
    <div className="error-box">
      {error}
    </div>
  )}

  {!loading &&
    !error &&
    meetings.length === 0 && (

      <div className="empty-state">

        <div className="empty-icon">
          ⚠️
        </div>

        <h2>
          No conflicts found
        </h2>

        <p>
          The API returned no conflicting meetings.
        </p>

      </div>
    )}

  {!loading &&
    !error &&
    meetings.length > 0 && (

      <div className="meetings-table-container">

        <table className="meetings-table">

          <thead>

            <tr>

              <th>
                Meeting ID
              </th>

              <th>
                Title
              </th>

              <th>
                Status
              </th>

              <th>
                Conflicts
              </th>

            </tr>

          </thead>

          <tbody>

            {meetings.map(
              function (meeting, index) {

                const id =
                  getMeetingId(
                    meeting,
                    index
                  );

                const conflictCount =
                  getConflictCount(
                    meeting
                  );

                return (
                  <tr key={id}>

                    <td>

                      <strong className="meeting-id">
                        {id}
                      </strong>

                    </td>

                    <td>
                      {getMeetingTitle(
                        meeting
                      )}
                    </td>

                    <td>

                      <StatusBadge
                        status={
                          getMatchStatus(
                            meeting
                          )
                        }
                      />

                    </td>

                    <td>

                      <span className="conflict-badge">
                        {conflictCount}
                      </span>

                    </td>

                  </tr>
                );
              }
            )}

          </tbody>

        </table>

      </div>
    )}

</div>


);
}

/* =========================================================
SUMMARY
========================================================= */

function Summary() {
const [summary, setSummary] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {


async function loadSummary() {
  try {
    setLoading(true);
    setError("");

    const data =
      await getReconciliationSummary();

    setSummary(data);
  } catch (err) {
    setError(
      err.message ||
        "Failed to load summary"
    );
  } finally {
    setLoading(false);
  }
}

loadSummary();


}, []);

return ( <div className="page">

  <div className="page-header">

    <h1>
      Summary
    </h1>

    <p>
      Reconciliation and data quality summary.
    </p>

  </div>

  {loading && (
    <div className="loading-message">
      Loading summary...
    </div>
  )}

  {error && (
    <div className="error-box">
      {error}
    </div>
  )}

  {summary && !loading && (

    <div className="stats-grid">

      <div className="stat-card">

        <div className="stat-title">
          CRM Records
        </div>

        <div className="stat-value">
          {summary.total_crm_records}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Calendar Records
        </div>

        <div className="stat-value">
          {summary.total_calendar_records}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Matched
        </div>

        <div className="stat-value">
          {summary.matched}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          CRM Only
        </div>

        <div className="stat-value">
          {summary.crm_only}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Calendar Only
        </div>

        <div className="stat-value">
          {summary.calendar_only}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Conflicts
        </div>

        <div className="stat-value">
          {summary.conflicts}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Possible Duplicates
        </div>

        <div className="stat-value">
          {summary.possible_duplicates}
        </div>

      </div>

      <div className="stat-card">

        <div className="stat-title">
          Validation Issues
        </div>

        <div className="stat-value">
          {summary.validation_issues}
        </div>

      </div>

    </div>

  )}

</div>


);
}

/* =========================================================
API HEALTH
========================================================= */

function ApiHealth() {
const [health, setHealth] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function checkHealth() {
try {
setLoading(true);
setError("");


  const data = await getHealth();

  setHealth(data);
} catch (err) {
  setError(
    err.message ||
      "API health check failed"
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
checkHealth();
}, []);

return ( <div className="page">


  <div className="page-header">

    <h1>
      API Health
    </h1>

    <p>
      Event Sync Service backend health status.
    </p>

  </div>

  {loading && (
    <div className="loading-message">
      Checking API health...
    </div>
  )}

  {error && (

    <div className="error-box">

      <strong>
        API unavailable
      </strong>

      <p>
        {error}
      </p>

      <button onClick={checkHealth}>
        Retry
      </button>

    </div>

  )}

  {health && !loading && (

    <div className="dashboard-card">

      <h2>
        API Status
      </h2>

      <pre
        style={{
          marginTop: "20px",
          padding: "20px",
          background: "#f8fafc",
          borderRadius: "10px",
          overflowX: "auto",
          fontSize: "13px",
        }}
      >
        {JSON.stringify(
          health,
          null,
          2
        )}
      </pre>

    </div>

  )}

</div>


);
}

/* =========================================================
MAIN APP
========================================================= */

function App() {
return ( <BrowserRouter>


  <div className="app-layout">

    <Sidebar />

    <main className="main-content">

      <Routes>

        {/* DASHBOARD */}

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* ALL MEETINGS */}

        <Route
          path="/meetings"
          element={<AllMeetings />}
        />


        {/* RECONCILIATION */}

        <Route
          path="/reconciliation"
          element={<ReconciliationPage />}
        />


        {/* REVIEW QUEUE */}

        <Route
          path="/review-queue"
          element={<ReviewQueue />}
        />


        {/* DUPLICATE EXPLORER */}

        <Route
          path="/duplicates"
          element={<DuplicateExplorer />}
        />


        {/* CONFLICTS */}

        <Route
          path="/conflicts"
          element={<Conflicts />}
        />


        {/* VALIDATION */}

        <Route
          path="/validation"
          element={<Validation />}
        />


        {/* SUMMARY */}

        <Route
          path="/summary"
          element={<Summary />}
        />


        {/* API HEALTH */}

        <Route
          path="/api-health"
          element={<ApiHealth />}
        />


        {/* FALLBACK */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </main>

  </div>

</BrowserRouter>


);
}

export default App;
