import { getCustomers } from "./dataService.js";

export async function findCustomerBySignalId(signalId) {
  const normalizedSignalId = String(signalId || "").trim();
  if (!normalizedSignalId) {
    throw Object.assign(new Error("signal_id is required"), { statusCode: 400 });
  }

  const customers = await getCustomers();
  const customer = customers.find((item) => item.signal_id === normalizedSignalId);
  if (!customer) {
    throw Object.assign(new Error(`No customer found for signal_id ${normalizedSignalId}`), {
      statusCode: 404,
    });
  }

  return {
    ...customer,
    full_name: `${customer.first_name} ${customer.last_name}`,
  };
}

export async function buildSignalEvent(signalId, incidentType = "power_outage") {
  const customer = await findCustomerBySignalId(signalId);
  return {
    signal_id: customer.signal_id,
    customer_id: customer.customer_id,
    incident_type: incidentType,
    received_at: new Date().toISOString(),
    customer,
  };
}
