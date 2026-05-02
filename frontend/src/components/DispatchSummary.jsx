export default function DispatchSummary({ summary }) {
  const factors = summary?.key_risk_factors || [];

  return (
    <section className="widget summary-widget">
      <div className="widget-heading">
        <p>LLM Dispatch Summary</p>
        <span>{summary?.mode || "waiting"}</span>
      </div>
      <p className="summary-copy">{summary?.summary || "Run a signal to generate the dispatcher summary."}</p>

      <div className="risk-chip-row">
        {factors.map((factor) => (
          <span key={factor}>{factor}</span>
        ))}
      </div>

      <div className="summary-block">
        <span>Recommended Action</span>
        <strong>{summary?.recommended_action || "Pending dispatch recommendation"}</strong>
      </div>

      <div className="summary-block muted">
        <span>Responder Reasoning</span>
        <p>{summary?.responder_reasoning || "Waiting for responder ranking."}</p>
      </div>
    </section>
  );
}
