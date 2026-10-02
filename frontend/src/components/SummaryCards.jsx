function SummaryCards({
  summary,
  loading
}) {

  if (loading) {
    return (
      <div className="summary-grid">

        {Array.from({
          length: 6
        }).map((_, index) => (
          <div
            key={index}
            className="summary-card loading-card"
          >
            <div className="skeleton"></div>
            <div className="skeleton small"></div>
          </div>
        ))}

      </div>
    );
  }


  if (!summary) {
    return null;
  }


  const cards = [
    {
      label: "CRM Records",
      value: summary.total_crm_records
    },
    {
      label: "Calendar Records",
      value: summary.total_calendar_records
    },
    {
      label: "Matched",
      value: summary.matched_records
    },
    {
      label: "CRM Only",
      value: summary.crm_only_records
    },
    {
      label: "Calendar Only",
      value: summary.calendar_only_records
    },
    {
      label: "Conflicts",
      value: summary.conflicts
    }
  ];


  return (
    <div className="summary-grid">

      {cards.map((card) => (
        <div
          className="summary-card"
          key={card.label}
        >

          <div className="summary-label">
            {card.label}
          </div>

          <div className="summary-value">
            {card.value}
          </div>

        </div>
      ))}

    </div>
  );
}

export default SummaryCards;