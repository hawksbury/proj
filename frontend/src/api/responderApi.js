const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";

export async function fetchResponders() {
  const response = await fetch(`${API_BASE_URL}/api/responders`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Responder request failed");
  }

  return payload.responders;
}
