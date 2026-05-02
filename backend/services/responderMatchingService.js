import { getResponders } from "./dataService.js";

export async function getResponderOptions(mlResult, limit = 5) {
  const responders = await getResponders();
  const knownResponderIds = new Set(responders.map((responder) => responder.responder_id));

  return (mlResult.top_responders || [])
    .filter((responder) => knownResponderIds.has(responder.responder_id))
    .slice(0, limit)
    .map((responder, index) => ({
      rank: index + 1,
      ...responder,
      recommendation_reason: buildResponderReason(responder, mlResult.prediction),
    }));
}

function buildResponderReason(responder, prediction) {
  const reasons = [];
  if (responder.profession === prediction.recommended_responder_profession) {
    reasons.push(`profession match: ${responder.profession}`);
  }
  if (responder.status === "available") reasons.push("currently available");
  if (responder.capabilities?.oxygen_support) reasons.push("oxygen support capable");
  if (responder.capabilities?.mobility_transfer) reasons.push("mobility transfer capable");
  reasons.push(`${responder.distance_miles} miles away`);
  return reasons.join(", ");
}
