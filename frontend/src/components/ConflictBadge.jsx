function ConflictBadge({
  count
}) {

  if (!count) {
    return (
      <span className="no-conflict">
        —
      </span>
    );
  }


  return (
    <span className="conflict-badge">
      {count} conflict
      {count !== 1 ? "s" : ""}
    </span>
  );
}

export default ConflictBadge;