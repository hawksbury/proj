const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";

export async function fetchAlerts() {
  const response = await fetch(`${BASE_URL}/api/alerts`);
  if (!response.ok) throw new Error(`Failed to fetch alerts: ${response.status}`);
  return response.json();
}
