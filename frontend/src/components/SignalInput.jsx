const incidents = [
  "power_outage",
  "flood",
  "wildfire_smoke",
  "tornado_damage",
  "chemical_spill",
  "extreme_heat",
  "winter_storm",
];

export default function SignalInput({
  signalId,
  incidentType,
  loading,
  error,
  onSignalChange,
  onIncidentChange,
  onSubmit,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="control-band">
      <form className="signal-form" onSubmit={handleSubmit}>
        <label>
          <span>Device Signal</span>
          <input
            value={signalId}
            onChange={(event) => onSignalChange(event.target.value)}
            placeholder="SCRBS-0001"
          />
        </label>
        <label>
          <span>Incident Type</span>
          <select value={incidentType} onChange={(event) => onIncidentChange(event.target.value)}>
            {incidents.map((incident) => (
              <option key={incident} value={incident}>
                {formatIncident(incident)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Running AI" : "Run Dispatch"}
        </button>
      </form>
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}

function formatIncident(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
