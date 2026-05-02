export default function ResponderCaseQueue({ cases, selectedCaseId, onSelectCase }) {
  const topCases = cases.slice(0, 3);

  return (
    <section className="widget case-queue-widget">
      <div className="widget-heading">
        <p>Top 3 Relevant People</p>
        <span>{cases.length} matching cases</span>
      </div>

      <div className="case-list">
        {topCases.map((caseItem, index) => (
          <button
            className={`case-row ${selectedCaseId === caseItem.signal_id ? "selected" : ""}`}
            key={caseItem.signal_id}
            type="button"
            onClick={() => onSelectCase(caseItem)}
          >
            <span className="case-rank">{index + 1}</span>
            <div className="case-main">
              <strong>{caseItem.name}</strong>
              <span>{caseItem.city}, {caseItem.state} · {formatIncident(caseItem.incident_type)}</span>
              <div className="case-tags">
                {caseItem.needs.slice(0, 3).map((need) => (
                  <i key={need}>{need}</i>
                ))}
              </div>
            </div>
            <div className="case-score">
              <strong>{caseItem.priority_score.toFixed(1)}</strong>
              <span>{caseItem.distance_miles} mi</span>
            </div>
            <aside className="case-popover">
              <strong>{caseItem.customer_id}</strong>
              <p>{caseItem.hover}</p>
              <span>Escalation probability: {caseItem.escalation_probability}%</span>
            </aside>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatIncident(value) {
  return value.replaceAll("_", " ");
}
