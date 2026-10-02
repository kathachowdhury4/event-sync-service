function StatusBadge({
  status
}) {

  const normalized =
    status?.toUpperCase() ||
    "UNKNOWN";


  const labels = {
    MATCHED: "Matched",
    CRM_ONLY: "CRM Only",
    CALENDAR_ONLY: "Calendar Only"
  };


  return (
    <span
      className={`status-badge status-${normalized.toLowerCase()}`}
    >
      {labels[normalized] ||
        normalized}
    </span>
  );
}

export default StatusBadge;