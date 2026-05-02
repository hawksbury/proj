export default function ResponderOptions({ responders }) {
  return (
    <section className="widget responder-widget">
      <div className="widget-heading">
        <p>Responder Match Options</p>
        <span>{responders.length} ranked</span>
      </div>

      <div className="responder-list">
        {responders.map((responder) => (
          <article className="responder-card" key={responder.responder_id}>
            <div>
              <span className="rank">#{responder.rank}</span>
              <h3>{responder.name}</h3>
              <p>{responder.profession} · {responder.agency}</p>
            </div>
            <strong>{responder.score}</strong>
            <div className="responder-stats">
              <span>{responder.distance_miles} mi</span>
              <span>{responder.status}</span>
              <span>{responder.capabilities?.oxygen_support ? "O2 support" : "No O2"}</span>
              <span>{responder.capabilities?.mobility_transfer ? "Transfer" : "No transfer"}</span>
            </div>
            <div className="match-track">
              <span style={{ width: `${Math.max(12, Math.min(responder.score, 100))}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
