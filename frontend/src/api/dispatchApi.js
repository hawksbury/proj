const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";

export async function fetchDispatch(signalId, incidentType = "power_outage", limit = 3) {
  const url = new URL(`/api/dispatch/${signalId}`, API_BASE_URL);
  url.searchParams.set("incident_type", incidentType);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Dispatch request failed");
  }

  return payload;
}
