export default function PriorityDashboard({ dispatch, modelMetrics }) {
  const prediction = dispatch?.prediction;
  const score = prediction?.priority_score ?? 0;
  const probability = Math.round((prediction?.escalation_probability ?? 0) * 100);

  return (
    <section className="widget priority-widget">
      <div className="widget-heading">
        <p>ML Priority Engine</p>
        <span>{prediction?.recommended_responder_profession || "waiting"}</span>
      </div>

      <div className="priority-main">
        <div className="gauge" style={{ "--score": `${score * 1.8}deg` }}>
          <div className="needle" />
          <div className="gauge-center">
            <strong>{score ? score.toFixed(1) : "--"}</strong>
            <span>{prediction?.priority_level || "pending"}</span>
          </div>
        </div>

        <div className="risk-bars">
          <MetricBar label="Escalation" value={probability} />
          <MetricBar label="Priority" value={Math.round(score)} />
          <MetricBar label="Responder Fit" value={88} />
        </div>
      </div>

      <div className="metric-card-grid">
        {modelMetrics.map((metric) => (
          <div className={`mini-metric ${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className="stacked-chart" aria-label="Case priority distribution">
        <div style={{ "--height": "76%", "--c": "#d94f5c" }} />
        <div style={{ "--height": "58%", "--c": "#e7b94d" }} />
        <div style={{ "--height": "42%", "--c": "#37b9a1" }} />
        <div style={{ "--height": "24%", "--c": "#3187b8" }} />
      </div>
      <div className="chart-labels">
        <span>Critical</span>
        <span>High</span>
        <span>Med</span>
        <span>Low</span>
      </div>
    </section>
  );
}

function MetricBar({ label, value }) {
  return (
    <div className="metric-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="bar-track">
        <span style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}
