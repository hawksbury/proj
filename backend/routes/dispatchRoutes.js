import { buildSignalEvent } from "../services/signalLookupService.js";
import { predictDispatch } from "../services/priorityService.js";
import { getResponderOptions } from "../services/responderMatchingService.js";
import { createDispatchSummary } from "../services/llmDispatchService.js";

export async function handleDispatchCreate(request, response, context) {
  const signalId = context.body?.signal_id;
  const incidentType = context.body?.incident_type || "power_outage";
  const limit = Number(context.body?.limit || 5);

  const result = await runDispatchFlow({ signalId, incidentType, limit });
  response.status(201).json(result);
}

export async function runDispatchFlow({ signalId, incidentType = "power_outage", limit = 5 }) {
  const signalEvent = await buildSignalEvent(signalId, incidentType);
  const mlResult = await predictDispatch(signalId, { incidentType, limit });
  const responderOptions = await getResponderOptions(mlResult, limit);
  const dispatchSummary = await createDispatchSummary({
    signalEvent,
    mlResult,
    responderOptions,
  });

  return {
    signal: signalEvent,
    prediction: mlResult.prediction,
    customer: signalEvent.customer,
    responder_options: responderOptions,
    dispatch_summary: dispatchSummary,
  };
}

export async function handleDispatchPreview(request, response, context) {
  context.body = {
    signal_id: context.params.signal_id,
    incident_type: context.query.get("incident_type") || "power_outage",
    limit: context.query.get("limit") || 5,
  };
  await handleDispatchCreate(request, response, context);
}
