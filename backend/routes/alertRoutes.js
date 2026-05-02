import { findCustomerBySignalId } from "../services/signalLookupService.js";

const alerts = [];
let nextAlertId = 1;

/**
 * Composite priority score (0–100).
 *
 * The registry base_priority_score reflects pre-assessed vulnerability.
 * Each bonus below reflects an additional, concrete response burden that
 * makes this person harder or more urgent to reach.
 *
 * All bonuses are additive and the total is capped at 100.
 *
 * Levels:
 *   critical  90–100  Immediate response, life may be at immediate risk
 *   high      75–89   Respond within 30 min
 *   medium    55–74   Queue and respond promptly
 *   low        0–54   Monitor; lower urgency
 */
export function computePriority(customer) {
  if (!customer) return { score: 10, level: "unknown", factors: [] };

  let score = Number(customer.baseline_priority_score) || 50;
  const factors = [];

  // ── Life-critical equipment ──────────────────────────────────────────
  if (customer.oxygen_dependent) {
    score += 25;
    factors.push({ label: "Oxygen dependent", bonus: 25, why: "Power loss can be immediately fatal" });
  }
  if (customer.power_dependent_equipment) {
    score += 20;
    factors.push({ label: "Power-dependent equipment", bonus: 20, why: "Dialysis, ventilator, CPAP — cannot function without power" });
  }

  // ── Evacuation difficulty ─────────────────────────────────────────────
  const evacLevel = String(customer.evacuation_assistance_level || "").toLowerCase();
  if (evacLevel === "critical") {
    score += 15;
    factors.push({ label: "Critical evacuation level", bonus: 15, why: "Requires specialized transport and significant coordination" });
  } else if (evacLevel === "high") {
    score += 10;
    factors.push({ label: "High evacuation level", bonus: 10, why: "Needs substantial assistance; cannot self-evacuate" });
  }

  // ── Mobility ──────────────────────────────────────────────────────────
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

  // ── Social isolation ──────────────────────────────────────────────────
  if (customer.lives_alone) {
    score += 8;
    factors.push({ label: "Lives alone", bonus: 8, why: "No one on-site to assist; response gap is larger" });
  }

  // ── Transport ─────────────────────────────────────────────────────────
  if (customer.needs_accessible_transport) {
    score += 5;
    factors.push({ label: "Accessible transport required", bonus: 5, why: "Requires wheelchair van or specialty vehicle" });
  }

  // ── Communication / language barrier ─────────────────────────────────
  const lang = String(customer.primary_language || "").toLowerCase();
  const comms = String(customer.communication_needs || "").toLowerCase();
  if (lang === "asl" || comms.includes("asl")) {
    score += 5;
    factors.push({ label: "ASL interpreter required", bonus: 5, why: "Arranging ASL interpreter adds coordination time" });
  } else if (comms.includes("translator") || (lang && lang !== "english")) {
    score += 3;
    factors.push({ label: "Language translator required", bonus: 3, why: "Non-English primary language adds response time" });
  }

  // ── Service animal ────────────────────────────────────────────────────
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

export async function handleAlertCreate(request, response, context) {
  const { person_id, received_time, latitude, longitude } = context.body;

  if (!person_id) {
    throw Object.assign(new Error("person_id is required"), { statusCode: 400 });
  }

  let customer = null;
  let customerError = null;

  try {
    customer = await findCustomerBySignalId(person_id);
  } catch (err) {
    customerError = err.message;
  }

  const priority = computePriority(customer);

  const alert = {
    alert_id: nextAlertId++,
    person_id,
    received_time: received_time || new Date().toISOString(),
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    received_at: new Date().toISOString(),
    customer: customer || null,
    customer_error: customerError || null,
    priority,
  };

  alerts.push(alert);
  if (alerts.length > 50) alerts.shift();
  alerts.sort((a, b) => b.priority.score - a.priority.score);

  response.status(201).json(alert);
}

export function handleAlertList(_request, response) {
  response.json({ alerts, count: alerts.length });
}
