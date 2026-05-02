import { buildSignalEvent, findCustomerBySignalId } from "../services/signalLookupService.js";

export async function handleSignalLookup(request, response, context) {
  const signalId = context.params.signal_id || context.body?.signal_id;
  const customer = await findCustomerBySignalId(signalId);
  response.json({ signal_id: customer.signal_id, customer });
}

export async function handleSignalEvent(request, response, context) {
  const signalId = context.body?.signal_id;
  const incidentType = context.body?.incident_type || "power_outage";
  const signalEvent = await buildSignalEvent(signalId, incidentType);
  response.status(201).json(signalEvent);
}
