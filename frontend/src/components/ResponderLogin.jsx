export default function ResponderLogin({ responder }) {
  return (
    <section className="responder-login">
      <div>
        <p className="eyebrow">Responder Workspace</p>
        <h2>{responder?.name}</h2>
        <span>{responder?.profession} · {responder?.agency}</span>
      </div>
      <div className="capability-strip">
        {responder?.capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </section>
  );
}
