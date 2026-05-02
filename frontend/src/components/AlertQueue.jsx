import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ScoringGuide from "./ScoringGuide.jsx";

// ── Client-side priority fallback ─────────────────────────────────────────────
// Mirrors alertRoutes.js computePriority so scores always show even when
// the backend was started before the priority field was introduced.

function computeLocalPriority(customer) {
  if (!customer) return { score: 10, level: "unknown", factors: [] };

  let score = Number(customer.baseline_priority_score) || 50;
  const factors = [];

  if (customer.oxygen_dependent) {
    score += 25;
    factors.push({ label: "Oxygen dependent", bonus: 25, why: "Power loss can be immediately fatal" });
  }
  if (customer.power_dependent_equipment) {
    score += 20;
    factors.push({ label: "Power-dependent equipment", bonus: 20, why: "Dialysis, ventilator, CPAP — cannot function without power" });
  }

  const evacLevel = String(customer.evacuation_assistance_level || "").toLowerCase();
  if (evacLevel === "critical") {
    score += 15;
    factors.push({ label: "Critical evacuation level", bonus: 15, why: "Requires specialized transport and significant coordination" });
  } else if (evacLevel === "high") {
    score += 10;
    factors.push({ label: "High evacuation level", bonus: 10, why: "Needs substantial assistance; cannot self-evacuate" });
  }

  const mobility = String(customer.mobility_level || "").toLowerCase();
  if (mobility === "needs_transfer_help") {
    score += 10;
    factors.push({ label: "Needs physical transfer", bonus: 10, why: "Cannot move independently; requires staff to lift or transfer" });
  } else if (mobility === "non_ambulatory") {
    score += 8;
    factors.push({ label: "Non-ambulatory", bonus: 8, why: "Cannot walk — mobility equipment required for evacuation" });
  } else if (mobility.includes("wheelchair")) {
    score += 5;
    factors.push({ label: "Wheelchair user", bonus: 5, why: "Standard vehicle unusable; accessible transport required" });
  } else if (mobility === "limited_walking") {
    score += 3;
    factors.push({ label: "Limited walking ability", bonus: 3, why: "Partial mobility — extra assistance needed" });
  }

  if (customer.lives_alone) {
    score += 8;
    factors.push({ label: "Lives alone", bonus: 8, why: "No one on-site to assist; response gap is larger" });
  }

  if (customer.needs_accessible_transport) {
    score += 5;
    factors.push({ label: "Accessible transport required", bonus: 5, why: "Requires wheelchair van or specialty vehicle" });
  }

  const lang = String(customer.primary_language || "").toLowerCase();
  const comms = String(customer.communication_needs || "").toLowerCase();
  if (lang === "asl" || comms.includes("asl")) {
    score += 5;
    factors.push({ label: "ASL interpreter required", bonus: 5, why: "Arranging ASL interpreter adds coordination time" });
  } else if (comms.includes("translator") || (lang && lang !== "english")) {
    score += 3;
    factors.push({ label: "Language translator required", bonus: 3, why: "Non-English primary language adds response time" });
  }

  if (customer.service_animal) {
    score += 3;
    factors.push({ label: "Service animal", bonus: 3, why: "Transport and shelter must accommodate service animal" });
  }

  score = Math.min(100, Math.round(score));

  let level;
  if (score >= 90) level = "critical";
  else if (score >= 75) level = "high";
  else if (score >= 55) level = "medium";
  else level = "low";

  return { score, level, factors };
}

// ── AlertQueue ────────────────────────────────────────────────────────────────

export default function AlertQueue({ alerts, onSelectAlert, selectedAlertId }) {
  const [expandedId, setExpandedId] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const seenIds = useRef(new Set());
  const itemRefs = useRef({});
  const prevTops = useRef({});

  // Detect newly arrived alerts and apply highlight class
  useEffect(() => {
    const fresh = [];
    alerts.forEach((a) => {
      if (!seenIds.current.has(a.alert_id)) {
        fresh.push(a.alert_id);
        seenIds.current.add(a.alert_id);
      }
    });
    if (fresh.length === 0) return;
    setHighlightedIds((prev) => new Set([...prev, ...fresh]));
    const t = setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        fresh.forEach((id) => next.delete(id));
        return next;
      });
    }, 2800);
    return () => clearTimeout(t);
  }, [alerts]);

  // FLIP animation: animate existing items from old positions to new positions
  useLayoutEffect(() => {
    const slice = alerts.slice(0, 10);

    slice.forEach((a) => {
      const el = itemRefs.current[a.alert_id];
      const oldTop = prevTops.current[a.alert_id];
      if (!el || oldTop === undefined) return;
      const newTop = el.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (Math.abs(delta) < 2) return;

      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
          el.style.transform = "";
        });
      });
    });

    slice.forEach((a) => {
      const el = itemRefs.current[a.alert_id];
      if (el) prevTops.current[a.alert_id] = el.getBoundingClientRect().top;
    });
  }, [alerts]);

  function handleRowClick(alert) {
    setExpandedId((prev) => (prev === alert.alert_id ? null : alert.alert_id));
    onSelectAlert(alert);
  }

  return (
    <section className="widget alert-queue-widget">
      <div className="widget-heading">
        <div className="queue-title-group">
          <p>Live Priority Queue</p>
          {alerts.length > 0 && (
            <span className="queue-subtitle">re-sorts on each new signal</span>
          )}
        </div>
        <span>{alerts.length > 0 ? `${alerts.length} active` : "Awaiting signals"}</span>
      </div>

      {alerts.length === 0 ? (
        <p className="alert-empty">No alerts yet — press the button to simulate a distress signal.</p>
      ) : (
        <div className="alert-list">
          {alerts.slice(0, 10).map((alert, index) => {
            // Use backend priority if available, otherwise compute locally
            const priority = alert.priority ?? computeLocalPriority(alert.customer);
            const isNew = highlightedIds.has(alert.alert_id);
            const isExpanded = expandedId === alert.alert_id;
            const isSelected = selectedAlertId === alert.alert_id;
            const level = priority.level;

            return (
              <div
                key={alert.alert_id}
                className={`alert-item-wrap ${isNew ? "alert-is-new" : ""} priority-level-${level}`}
                ref={(el) => {
                  if (el) itemRefs.current[alert.alert_id] = el;
                  else delete itemRefs.current[alert.alert_id];
                }}
              >
                <button
                  className={`alert-row ${isSelected ? "selected" : ""} priority-level-${level}`}
                  type="button"
                  onClick={() => handleRowClick(alert)}
                >
                  <div className="alert-rank">{index + 1}</div>

                  <div className="alert-main">
                    <div className="alert-name-row">
                      <strong>{alert.customer ? alert.customer.full_name : alert.person_id}</strong>
                      <span className={`priority-badge level-${level}`}>{level.toUpperCase()}</span>
                    </div>
                    <span className="alert-meta">
                      {alert.person_id} · {formatTime(alert.received_time)}
                    </span>
                    {alert.customer && (
                      <span className="alert-location">{alert.customer.city}, {alert.customer.state}</span>
                    )}
                    {!alert.customer && (
                      <span className="alert-unknown">ID not in registry</span>
                    )}
                    <div className="need-tags">
                      {getNeedTags(alert.customer).map((t) => (
                        <i key={t.label} className={`need-tag urgency-${t.urgency}`}>{t.label}</i>
                      ))}
                    </div>
                  </div>

                  <div className="alert-score-col">
                    <strong className={`score-num level-${level}`}>{priority.score}</strong>
                    <span>/ 100</span>
                  </div>

                  <div className="expand-arrow">{isExpanded ? "▲" : "▼"}</div>
                </button>

                <div className={`brief-wrapper ${isExpanded ? "open" : ""}`}>
                  <div className="brief-inner">
                    {alert.customer
                      ? <ResponderBrief alert={alert} priority={priority} />
                      : <p className="brief-not-found">No customer record found for {alert.person_id}.</p>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ScoringGuide />
    </section>
  );
}

// ── Responder Brief ───────────────────────────────────────────────────────────

function ResponderBrief({ alert, priority }) {
  const c = alert.customer;

  const criticalPreps = [];
  if (c.oxygen_dependent)
    criticalPreps.push({ label: "Oxygen concentrator", detail: "Ensure powered transport — do not delay" });
  if (c.power_dependent_equipment && c.equipment_dependencies !== "none")
    criticalPreps.push({ label: "Power-dependent equipment", detail: c.equipment_dependencies?.replaceAll("|", ", ") });
  const mob = String(c.mobility_level || "");
  if (mob === "needs_transfer_help")
    criticalPreps.push({ label: "Physical transfer required", detail: "Patient cannot move independently" });
  if (mob === "non_ambulatory")
    criticalPreps.push({ label: "Non-ambulatory patient", detail: "Mobility equipment or lift required" });
  if (c.needs_accessible_transport)
    criticalPreps.push({ label: "Accessible vehicle needed", detail: c.service_animal ? "Service animal must board together" : null });
  const lang = c.primary_language;
  if (lang && lang !== "English" && lang !== "english")
    criticalPreps.push({ label: `${lang} speaker`, detail: String(c.communication_needs || "").replaceAll("|", ", ") });

  return (
    <div className="responder-brief-card">

      {/* Signal bar */}
      <div className={`brief-signal-bar level-${priority.level}`}>
        <span className="brief-signal-id">{alert.person_id}</span>
        <span>Received {alert.received_time}</span>
        {alert.latitude && (
          <span>{Number(alert.latitude).toFixed(4)}°, {Number(alert.longitude).toFixed(4)}°</span>
        )}
        <span className="brief-score-pill">{priority.score} / 100</span>
      </div>

      <div className="brief-body">

        {/* Why this score */}
        {priority.factors?.length > 0 && (
          <div className="brief-section brief-full-width">
            <h4 className="brief-heading">Why this score</h4>
            <div className="brief-factors-list">
              <div className="brief-base-score">
                <span>Registry base score</span>
                <strong>{c.baseline_priority_score}</strong>
                <span className="brief-base-note">Pre-assessed vulnerability level</span>
              </div>
              {priority.factors.map((f) => (
                <div key={f.label} className="brief-factor-row">
                  <span className="factor-bonus-pill">+{f.bonus}</span>
                  <div>
                    <strong>{f.label}</strong>
                    <span>{f.why}</span>
                  </div>
                </div>
              ))}
              <div className="brief-total-row">
                <span>Final score</span>
                <strong className={`score-num level-${priority.level}`}>{priority.score} / 100 — {priority.level.toUpperCase()}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Prepare for */}
        {criticalPreps.length > 0 && (
          <div className="brief-section brief-full-width brief-prepare">
            <h4 className="brief-heading critical">Prepare for</h4>
            <ul className="prepare-list">
              {criticalPreps.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong>
                  {item.detail && <span>{item.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Patient profile */}
        <div className="brief-section">
          <h4 className="brief-heading">Patient</h4>
          <div className="brief-grid">
            <span>Age / gender</span>
            <strong>{c.age} · {c.gender}</strong>
            <span>Lives alone</span>
            <strong className={c.lives_alone ? "text-warning" : ""}>{c.lives_alone ? "Yes — no support on-site" : "No"}</strong>
            <span>Mobility</span>
            <strong>{String(c.mobility_level || "unknown").replaceAll("_", " ")}</strong>
            <span>Evacuation</span>
            <strong>{c.evacuation_assistance_level || "—"}</strong>
            <span>Household</span>
            <strong>{c.household_size === 1 || c.lives_alone ? "Lives alone" : `${c.household_size} people`}</strong>
          </div>
        </div>

        {/* Medical */}
        <div className="brief-section">
          <h4 className="brief-heading">Medical</h4>
          <div className="brief-grid">
            <span>Conditions</span>
            <strong>{c.medical_conditions?.replaceAll("|", ", ") || "None on file"}</strong>
            <span>Medications</span>
            <strong>{c.medications?.replaceAll("|", ", ") || "None on file"}</strong>
            <span>Equipment</span>
            <strong>{c.equipment_dependencies?.replaceAll("|", ", ") || "None"}</strong>
          </div>
        </div>

        {/* Contacts */}
        <div className="brief-section">
          <h4 className="brief-heading">Contacts</h4>
          <div className="brief-contacts">
            {c.caregiver_name && (
              <div className="brief-contact-row">
                <span>Caregiver</span>
                <strong>{c.caregiver_name}</strong>
                <a href={`tel:${c.caregiver_phone}`}>{c.caregiver_phone}</a>
              </div>
            )}
            {c.emergency_contact_name && (
              <div className="brief-contact-row">
                <span>Emergency</span>
                <strong>{c.emergency_contact_name}</strong>
                <a href={`tel:${c.emergency_contact_phone}`}>{c.emergency_contact_phone}</a>
              </div>
            )}
            {c.preferred_hospital && (
              <div className="brief-contact-row">
                <span>Hospital</span>
                <strong>{c.preferred_hospital}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {c.notes && c.notes !== "none" && (
          <div className="brief-section">
            <h4 className="brief-heading">Notes</h4>
            <p className="brief-notes">{c.notes}</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNeedTags(customer) {
  if (!customer) return [];
  const tags = [];
  if (customer.oxygen_dependent) tags.push({ label: "O₂", urgency: "critical" });
  if (customer.power_dependent_equipment) tags.push({ label: "Power Equip", urgency: "high" });
  const mob = String(customer.mobility_level || "");
  if (mob === "needs_transfer_help" || mob === "non_ambulatory") tags.push({ label: "Transfer", urgency: "high" });
  if (customer.needs_accessible_transport) tags.push({ label: "Accessible", urgency: "medium" });
  if (customer.service_animal) tags.push({ label: "Service Animal", urgency: "medium" });
  const lang = String(customer.primary_language || "");
  if (lang === "ASL") tags.push({ label: "ASL", urgency: "medium" });
  return tags.slice(0, 5);
}

function formatTime(received_time) {
  if (!received_time) return "";
  const parts = String(received_time).split(" ");
  return parts.length > 1 ? parts[1] : received_time;
}
