export default function DispatchModal({ dispatch, onClose }) {
  if (!dispatch) return null;

  const c          = dispatch.customer;
  const prediction = dispatch.prediction;
  const summary    = dispatch.dispatch_summary;
  const responder  = dispatch.responder_options?.[0];
  const level      = prediction?.priority_level ?? "unknown";

  // Build equipment checklist
  const equipment = [];
  if (c.oxygen_dependent)          equipment.push("Portable oxygen supply");
  if (c.power_dependent_equipment) equipment.push(`Power source for: ${(c.equipment_dependencies || "").replaceAll("|", ", ")}`);
  if (!c.power_dependent_equipment && c.equipment_dependencies && c.equipment_dependencies !== "none")
                                   equipment.push(`Equipment: ${c.equipment_dependencies.replaceAll("|", ", ")}`);
  if (c.needs_accessible_transport) equipment.push("Accessible / wheelchair vehicle");
  if (c.service_animal)            equipment.push("Space for service animal");

  const mob = String(c.mobility_level || "");
  if (mob === "needs_transfer_help" || mob === "non_ambulatory") equipment.push("Lift / transfer team");

  const lang = c.primary_language;
  const comms = String(c.communication_needs || "");
  if (comms.toLowerCase().includes("asl") || lang === "ASL") equipment.push("ASL interpreter");
  else if (lang && lang !== "English")                        equipment.push(`${lang} interpreter`);

  if (c.medications && c.medications !== "none") equipment.push(`Medications on file: ${c.medications.replaceAll("|", ", ")}`);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={`modal-header level-bg-${level}`}>
          <div className="modal-title-group">
            <span className={`priority-badge level-${level}`}>{level.toUpperCase()}</span>
            <h2 className="modal-name">{c.full_name}</h2>
            <span className="modal-score">{prediction?.priority_score?.toFixed(0)} / 100</span>
          </div>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="modal-body">

          {/* Patient snapshot */}
          <div className="modal-section">
            <h3>Patient</h3>
            <div className="modal-grid">
              <span>Age</span><strong>{c.age} · {c.gender}</strong>
              <span>Location</span><strong>{c.address_line_1}, {c.city}, {c.state}</strong>
              <span>Incident</span><strong>{dispatch.signal?.incident_type?.replaceAll("_", " ")}</strong>
              <span>Mobility</span><strong>{mob.replaceAll("_", " ") || "—"}</strong>
              <span>Lives alone</span><strong className={c.lives_alone ? "text-warning" : ""}>{c.lives_alone ? "Yes" : "No"}</strong>
            </div>
          </div>

          {/* Equipment / materials checklist */}
          {equipment.length > 0 && (
            <div className="modal-section modal-checklist-section">
              <h3>Bring / Prepare</h3>
              <ul className="modal-checklist">
                {equipment.map((item) => (
                  <li key={item}>
                    <span className="check-box">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contacts */}
          <div className="modal-section">
            <h3>Contacts</h3>
            <div className="modal-contacts">
              {c.caregiver_name && (
                <div className="modal-contact-row">
                  <span>Caregiver</span>
                  <strong>{c.caregiver_name}</strong>
                  <a href={`tel:${c.caregiver_phone}`}>{c.caregiver_phone}</a>
                </div>
              )}
              {c.emergency_contact_name && (
                <div className="modal-contact-row">
                  <span>Emergency</span>
                  <strong>{c.emergency_contact_name}</strong>
                  <a href={`tel:${c.emergency_contact_phone}`}>{c.emergency_contact_phone}</a>
                </div>
              )}
              {c.preferred_hospital && (
                <div className="modal-contact-row">
                  <span>Hospital</span>
                  <strong>{c.preferred_hospital}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Recommended responder */}
          {responder && (
            <div className="modal-section">
              <h3>Dispatch To</h3>
              <div className="modal-responder">
                <strong>{responder.name}</strong>
                <span>{responder.profession} · {responder.agency}</span>
                <span>{responder.distance_miles?.toFixed(1)} mi away · {responder.status}</span>
              </div>
            </div>
          )}

          {/* Recommended action */}
          {summary?.recommended_action && (
            <div className="modal-section modal-action-section">
              <h3>Recommended Action</h3>
              <p>{summary.recommended_action}</p>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="modal-dismiss" type="button" onClick={onClose}>Dismiss</button>
        </div>

      </div>
    </div>
  );
}
