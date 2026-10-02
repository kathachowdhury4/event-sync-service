function ConfidenceBadge({
  confidence
}) {

  const percentage =
    Math.round(
      (confidence || 0) * 100
    );


  let className =
    "confidence-low";


  if (percentage >= 85) {
    className =
      "confidence-high";
  } else if (percentage >= 65) {
    className =
      "confidence-medium";
  }


  return (
    <span
      className={`confidence-badge ${className}`}
    >
      {percentage}%
    </span>
  );
}

export default ConfidenceBadge;