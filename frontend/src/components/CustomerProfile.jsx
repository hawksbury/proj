export default function CustomerProfile({ customer, signal }) {
  const rows = [
    ["Location", customer ? `${customer.city}, ${customer.state}` : "--"],
    ["Medical", customer?.medical_conditions || "--"],
    ["Disability", customer?.disability_types || "--"],
    ["Equipment", customer?.equipment_dependencies || "--"],
    ["Language", customer?.primary_language || "--"],
    ["Mobility", customer?.mobility_level || "--"],
  ];

  return (
    <section className="widget profile-widget">
      <div className="widget-heading">
        <p>Customer Emergency Profile</p>
        <span>{signal?.received_at ? new Date(signal.received_at).toLocaleTimeString() : "no signal"}</span>
      </div>

      <div className="profile-head">
        <div className="avatar">{initials(customer)}</div>
        <div>
          <h2>{customer?.full_name || "No customer selected"}</h2>
          <p>{customer?.customer_id || "Waiting for signal"}</p>
        </div>
      </div>

      <div className="profile-table">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="donut-row">
        <div className="donut" />
        <div className="legend">
          <span><i className="critical" /> Critical</span>
          <span><i className="high" /> High</span>
          <span><i className="medium" /> Medium</span>
        </div>
      </div>
    </section>
  );
}

function initials(customer) {
  if (!customer) return "--";
  return `${customer.first_name?.[0] || ""}${customer.last_name?.[0] || ""}`;
}
