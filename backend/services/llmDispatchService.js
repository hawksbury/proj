export async function createDispatchSummary({ signalEvent, mlResult, responderOptions }) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await createOpenAiDispatchSummary({ signalEvent, mlResult, responderOptions });
    } catch (error) {
      const fallback = createMockDispatchSummary({ signalEvent, mlResult, responderOptions });
      return {
        ...fallback,
        mode: "mock_summary_after_llm_error",
        llm_error: sanitizeLlmError(error.message),
      };
    }
  }

  return createMockDispatchSummary({ signalEvent, mlResult, responderOptions });
}

function sanitizeLlmError(message = "") {
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted_api_key]")
    .replace(/sk-proj-[A-Za-z0-9_-]+/g, "[redacted_api_key]");
}

async function createOpenAiDispatchSummary({ signalEvent, mlResult, responderOptions }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions:
        "You generate concise emergency dispatch decision support text. Use only the provided ML prediction, customer profile, and responder options. Do not invent facts. Do not claim a responder has been dispatched unless the input says so. Keep a human operator in the loop.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  signal: {
                    signal_id: signalEvent.signal_id,
                    customer_id: signalEvent.customer_id,
                    incident_type: signalEvent.incident_type,
                    received_at: signalEvent.received_at,
                  },
                  customer: publicCustomerProfile(signalEvent.customer),
                  prediction: mlResult.prediction,
                  responder_options: responderOptions,
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dispatch_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              key_risk_factors: {
                type: "array",
                items: { type: "string" },
              },
              recommended_action: { type: "string" },
              responder_reasoning: { type: "string" },
              dashboard_note: { type: "string" },
            },
            required: [
              "summary",
              "key_risk_factors",
              "recommended_action",
              "responder_reasoning",
              "dashboard_note",
            ],
          },
        },
      },
      max_output_tokens: 700,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI API request failed with ${response.status}`);
  }

  const text = payload.output_text || extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI response did not include output text");
  }

  return {
    mode: "openai_responses_api",
    ...JSON.parse(text),
  };
}

function createMockDispatchSummary({ signalEvent, mlResult, responderOptions }) {
  const riskFactors = buildRiskFactors(signalEvent.customer, signalEvent.incident_type);
  const topResponder = responderOptions[0];

  return {
    mode: "mock_summary",
    summary: `${signalEvent.customer.full_name} is ${mlResult.prediction.priority_level} priority with a score of ${mlResult.prediction.priority_score}. Recommended responder type is ${mlResult.prediction.recommended_responder_profession}.`,
    key_risk_factors: riskFactors,
    recommended_action: topResponder
      ? `Dispatch ${topResponder.name}, ${topResponder.profession}, from ${topResponder.agency}.`
      : `Dispatch the nearest available ${mlResult.prediction.recommended_responder_profession}.`,
    responder_reasoning: topResponder?.recommendation_reason || "No responder option was returned.",
    dashboard_note:
      "This summary is generated from ML outputs and responder ranking. Keep a human emergency operator in the loop.",
  };
}

function publicCustomerProfile(customer) {
  return {
    customer_id: customer.customer_id,
    age: customer.age,
    city: customer.city,
    state: customer.state,
    primary_language: customer.primary_language,
    communication_needs: customer.communication_needs,
    disability_types: customer.disability_types,
    mobility_level: customer.mobility_level,
    medical_conditions: customer.medical_conditions,
    medications: customer.medications,
    equipment_dependencies: customer.equipment_dependencies,
    power_dependent_equipment: customer.power_dependent_equipment,
    oxygen_dependent: customer.oxygen_dependent,
    needs_accessible_transport: customer.needs_accessible_transport,
    evacuation_assistance_level: customer.evacuation_assistance_level,
    baseline_priority_score: customer.baseline_priority_score,
    notes: customer.notes,
  };
}

function extractOutputText(payload) {
  return payload.output
    ?.flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("");
}

function buildRiskFactors(customer, incidentType) {
  const factors = [];
  if (customer.oxygen_dependent) factors.push("oxygen dependent");
  if (customer.power_dependent_equipment) factors.push("power-dependent equipment");
  if (customer.needs_accessible_transport) factors.push("accessible transport needed");
  if (String(customer.disability_types).includes("mobility")) factors.push("mobility disability");
  if (String(customer.medical_conditions).toLowerCase().includes("copd")) factors.push("COPD");
  if (String(customer.communication_needs).includes("ASL")) factors.push("ASL or communication support");
  factors.push(`incident type: ${incidentType}`);
  return factors;
}
