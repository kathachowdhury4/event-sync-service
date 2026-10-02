function FilterBar({
  filters,
  onChange,
  onRefresh
}) {

  return (
    <div className="filter-bar">

      <div className="filter-group">

        <label>
          Source
        </label>

        <select
          value={filters.source}
          onChange={(event) =>
            onChange({
              source:
                event.target.value
            })
          }
        >

          <option value="">
            All Sources
          </option>

          <option value="crm">
            CRM
          </option>

          <option value="calendar">
            Calendar
          </option>

        </select>

      </div>


      <div className="filter-group">

        <label>
          Match Status
        </label>

        <select
          value={filters.matchStatus}
          onChange={(event) =>
            onChange({
              matchStatus:
                event.target.value
            })
          }
        >

          <option value="">
            All
          </option>

          <option value="MATCHED">
            Matched
          </option>

          <option value="CRM_ONLY">
            CRM Only
          </option>

          <option value="CALENDAR_ONLY">
            Calendar Only
          </option>

        </select>

      </div>


      <div className="filter-group">

        <label>
          Conflicts
        </label>

        <select
          value={
            filters.hasConflicts === null
              ? ""
              : String(
                  filters.hasConflicts
                )
          }
          onChange={(event) => {

            const value =
              event.target.value;

            onChange({
              hasConflicts:
                value === ""
                  ? null
                  : value === "true"
            });

          }}
        >

          <option value="">
            All
          </option>

          <option value="true">
            Has Conflicts
          </option>

          <option value="false">
            No Conflicts
          </option>

        </select>

      </div>


      <button
        className="refresh-button"
        onClick={onRefresh}
      >
        Refresh
      </button>

    </div>
  );
}

export default FilterBar;