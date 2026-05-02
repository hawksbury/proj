import { buildSignalEvent } from "./signalLookupService.js";

const DEDUPE_WINDOW_MS = 15 * 60 * 1000;
const signalQueue = [];
let eventCounter = 1;

export async function ingestSignal({
  signal_id,
  incident_type = "power_outage",
  source_gateway = "local_gateway",
  device_latitude = null,
  device_longitude = null,
  battery_level = null,
  signal_strength = "unknown",
} = {}) {
  const signalEvent = await buildSignalEvent(signal_id, incident_type);
  const now = new Date();
  const existing = findRecentActiveSignal(signalEvent.signal_id, now);

  if (existing) {
    existing.last_seen_at = now.toISOString();
    existing.signal_count += 1;
    existing.status = "active";
    existing.battery_level = battery_level ?? existing.battery_level;
    existing.signal_strength = signal_strength || existing.signal_strength;
    existing.device_latitude = device_latitude ?? existing.device_latitude;
    existing.device_longitude = device_longitude ?? existing.device_longitude;
    return { signal_event: existing, deduplicated: true };
  }

  const queuedSignal = {
    event_id: nextEventId(),
    signal_id: signalEvent.signal_id,
    customer_id: signalEvent.customer_id,
    incident_type,
    first_received_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    signal_count: 1,
    source_gateway,
    device_latitude,
    device_longitude,
    battery_level,
    signal_strength,
    status: "queued",
    processed_at: null,
    priority_score: null,
    escalation_required: null,
    assigned_responder_id: null,
    customer: signalEvent.customer,
  };

  signalQueue.unshift(queuedSignal);
  return { signal_event: queuedSignal, deduplicated: false };
}

export function listSignals({ status } = {}) {
  return signalQueue.filter((signal) => !status || signal.status === status);
}

export function getSignalEvent(eventId) {
  return signalQueue.find((signal) => signal.event_id === eventId);
}

export function markSignalProcessing(eventId) {
  const signal = getSignalEvent(eventId);
  if (!signal) {
    throw Object.assign(new Error(`No signal event found for ${eventId}`), { statusCode: 404 });
  }
  signal.status = "processing";
  return signal;
}

export function markSignalProcessed(eventId, dispatchResult) {
  const signal = getSignalEvent(eventId);
  if (!signal) {
    throw Object.assign(new Error(`No signal event found for ${eventId}`), { statusCode: 404 });
  }

  signal.status = "prioritized";
  signal.processed_at = new Date().toISOString();
  signal.priority_score = dispatchResult.prediction?.priority_score ?? null;
  signal.escalation_required = dispatchResult.prediction?.escalation_required ?? null;
  signal.assigned_responder_id = dispatchResult.responder_options?.[0]?.responder_id ?? null;
  return signal;
}

function findRecentActiveSignal(signalId, now) {
  return signalQueue.find((signal) => {
    if (signal.signal_id !== signalId) return false;
    if (!["queued", "active", "processing", "prioritized"].includes(signal.status)) return false;
    const lastSeen = new Date(signal.last_seen_at);
    return now.getTime() - lastSeen.getTime() <= DEDUPE_WINDOW_MS;
  });
}

function nextEventId() {
  const id = `EVT-${String(eventCounter).padStart(6, "0")}`;
  eventCounter += 1;
  return id;
}
