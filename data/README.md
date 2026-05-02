# Synthetic Disaster Response Data

This fake dataset supports a hackathon app where a backend receives a `signal_id`
from a device/tag, timestamps the request, finds the matching customer, and then
prioritizes help plus recommends matching first responders.

## Backend Flow

1. Receive `signal_id` from the device.
2. Create `received_at` timestamp in the backend.
3. Look up the person in `customers.csv` using `signal_id`.
4. Combine the customer record with disaster context, shelter status, and responder availability.
5. Run prediction/ranking to estimate urgency.
6. Match the case to responder professions and show ranked AI dispatch options.

## Files

- `customers.csv`: 5,000 disabled/customer records. `signal_id` is the device id and maps directly to `customer_id`.
- `responders.csv`: 1,200 first responders with profession, certifications, location, shift, availability, and capabilities.
- `disaster_zones.csv`: 180 simulated disaster/context zones.
- `shelters.csv`: 220 shelters with capacity and accessibility resources.
- `historical_cases.csv`: 20,000 historical synthetic cases for model training/testing.
- `schema_notes.json`: Machine-readable notes about the intended lookup and modeling flow.

## Suggested AI/ML Setup

- Use a supervised ML model for prediction, not only an LLM.
- Train priority prediction using `historical_cases.priority_score_assigned` or `historical_cases.escalation_required`.
- Train responder matching using `historical_cases.matched_responder_profession`.
- Use an LLM for explanation, AI dispatch summaries, and structured decision support.

## Important Hackathon Note

These records are synthetic and should never be treated as real medical data.
For a demo, the model output should say why someone is high priority without
exposing unnecessary sensitive details.
