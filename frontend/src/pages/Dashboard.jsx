import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import Header
  from "../components/Header";

import SummaryCards
  from "../components/SummaryCards";

import FilterBar
  from "../components/FilterBar";

import MeetingTable
  from "../components/MeetingTable";

import MeetingDetails
  from "../components/MeetingDetails";

import {
  getMeetings,
  getSummary
} from "../services/api";


function Dashboard() {

  const [
    meetings,
    setMeetings
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState(null);

  const [
    selectedMeeting,
    setSelectedMeeting
  ] = useState(null);


  const [
    filters,
    setFilters
  ] = useState({
    source: "",
    matchStatus: "",
    hasConflicts: null
  });


  const [
    search,
    setSearch
  ] = useState("");


  const loadData =
    useCallback(
      async () => {

        setLoading(true);
        setError(null);

        try {

          const [
            meetingData,
            summaryData
          ] = await Promise.all([
            getMeetings(filters),
            getSummary()
          ]);

          setMeetings(
            meetingData
          );

          setSummary(
            summaryData
          );

        } catch (err) {

          console.error(err);

          setError(
            err.message ||
            "Unable to load data."
          );

        } finally {

          setLoading(false);

        }

      },
      [filters]
    );


  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredMeetings =
    useMemo(() => {

      if (!search.trim()) {
        return meetings;
      }

      const query =
        search
          .trim()
          .toLowerCase();


      return meetings.filter(
        (meeting) => {

          const searchable = [
            meeting.title,
            meeting.client_name,
            meeting.company,
            meeting.organizer,
            meeting.crm_id,
            meeting.calendar_id
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );

    }, [
      meetings,
      search
    ]);


  function handleFilterChange(
    changes
  ) {

    setFilters(
      (current) => ({
        ...current,
        ...changes
      })
    );

  }


  return (
    <div className="dashboard">

      <Header />


      <main className="main-content">

        <div className="page-heading">

          <div>

            <h2>
              Reconciled Meetings
            </h2>

            <p>
              Unified view of CRM and
              Calendar events
            </p>

          </div>


          <div className="search-container">

            <input
              type="search"
              placeholder="Search meetings..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

        </div>


        <SummaryCards
          summary={summary}
          loading={loading}
        />


        <FilterBar
          filters={filters}
          onChange={
            handleFilterChange
          }
          onRefresh={
            loadData
          }
        />


        {error && (

          <div className="error-banner">

            <strong>
              Error:
            </strong>

            <span>
              {error}
            </span>

            <button
              onClick={loadData}
            >
              Retry
            </button>

          </div>

        )}


        <MeetingTable
          meetings={
            filteredMeetings
          }
          loading={loading}
          onSelect={
            setSelectedMeeting
          }
        />

      </main>


      <MeetingDetails
        meeting={
          selectedMeeting
        }
        onClose={() =>
          setSelectedMeeting(null)
        }
      />

    </div>
  );
}


export default Dashboard;