import { getResponders } from "../services/dataService.js";

export async function handleResponderList(_request, response) {
  const responders = await getResponders();
  response.json({
    responders: responders.map((responder) => ({
      responder_id: responder.responder_id,
      name: `${responder.first_name} ${responder.last_name}`,
      profession: responder.profession,
      agency: responder.agency,
      status: responder.status,
      city: responder.staging_city,
      capabilities: buildCapabilities(responder),
    })),
  });
}

function buildCapabilities(responder) {
  return [
    responder.can_handle_oxygen_support ? "oxygen support" : null,
    responder.can_handle_mobility_transfer ? "mobility transfer" : null,
    responder.wheelchair_accessible_vehicle ? "accessible vehicle" : null,
    responder.can_transport_patient ? "patient transport" : null,
    responder.mental_health_trained ? "mental health" : null,
  ].filter(Boolean);
}
