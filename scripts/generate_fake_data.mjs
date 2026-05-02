import { writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("../data/", import.meta.url).pathname;

let seed = 20260502;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function pick(items) {
  return items[Math.floor(rand() * items.length)];
}

function pickMany(items, min, max) {
  const count = min + Math.floor(rand() * (max - min + 1));
  const copy = [...items];
  const chosen = [];
  while (chosen.length < count && copy.length) {
    chosen.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return chosen;
}

function bool(p = 0.5) {
  return rand() < p;
}

function num(min, max, decimals = 0) {
  const value = min + rand() * (max - min);
  return Number(value.toFixed(decimals));
}

function id(prefix, n, width = 6) {
  return `${prefix}${String(n).padStart(width, "0")}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(name, rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  writeFileSync(join(outDir, name), `${lines.join("\n")}\n`);
}

const firstNames = ["Aaliyah", "Amir", "Ana", "Andre", "Avery", "Camila", "Chen", "DeShawn", "Elena", "Fatima", "Grace", "Hassan", "Isabella", "Jamal", "Kai", "Layla", "Luis", "Maya", "Noah", "Olivia", "Priya", "Rafael", "Sam", "Sofia", "Tariq", "Valeria", "Yara", "Zoe"];
const lastNames = ["Ahmed", "Bennett", "Brooks", "Chen", "Davis", "Diaz", "Evans", "Garcia", "Haddad", "Johnson", "Khan", "Kim", "Lee", "Martinez", "Nguyen", "Patel", "Reed", "Rivera", "Santos", "Smith", "Taylor", "Thomas", "Wilson", "Young"];
const streets = ["Maple", "Cedar", "Pine", "Oak", "Lake", "Hill", "River", "Market", "Union", "Liberty", "Central", "Elm", "Walnut", "Sunset", "Park"];
const cities = [
  { city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698 },
  { city: "Dallas", state: "TX", lat: 32.7767, lon: -96.797 },
  { city: "Austin", state: "TX", lat: 30.2672, lon: -97.7431 },
  { city: "San Antonio", state: "TX", lat: 29.4241, lon: -98.4936 },
  { city: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715 },
  { city: "Baton Rouge", state: "LA", lat: 30.4515, lon: -91.1871 },
  { city: "Mobile", state: "AL", lat: 30.6954, lon: -88.0399 },
  { city: "Jackson", state: "MS", lat: 32.2988, lon: -90.1848 },
];
const languages = ["English", "Spanish", "Arabic", "Vietnamese", "Mandarin", "French", "ASL", "Hindi", "Urdu", "Tagalog"];
const disabilityTypes = ["mobility", "visual", "hearing", "cognitive", "respiratory", "medical_complexity", "developmental", "mental_health", "none"];
const medicalConditions = ["asthma", "COPD", "diabetes", "heart disease", "kidney disease", "epilepsy", "hypertension", "pregnancy", "severe allergy", "dementia", "PTSD", "none"];
const medications = ["insulin", "albuterol", "nitroglycerin", "epinephrine auto-injector", "anti-seizure medication", "blood thinner", "dialysis supplies", "oxygen", "none"];
const equipment = ["wheelchair", "walker", "cane", "portable oxygen concentrator", "CPAP", "dialysis machine", "power chair", "hearing aid", "white cane", "none"];
const professions = ["paramedic", "EMT", "firefighter", "search_and_rescue", "police", "nurse", "physician", "mental_health_crisis", "ASL_interpreter", "social_worker", "utility_technician", "evacuation_driver"];
const certs = ["BLS", "ALS", "CPR", "trauma", "swift_water_rescue", "hazmat", "wilderness_medicine", "incident_command", "crisis_intervention", "ASL", "oxygen_support", "mobility_transfer"];
const agencies = ["Metro EMS", "County Fire Rescue", "City Police", "Red Cross Response", "Disaster Medical Team", "Community Care Network", "Accessible Transit Unit", "Public Health Reserve"];
const vehicles = ["ambulance", "fire_engine", "SUV", "high_water_vehicle", "accessible_van", "pickup", "mobile_clinic", "none"];
const statuses = ["available", "assigned", "en_route", "off_shift", "staging"];
const zoneTypes = ["flood", "wildfire_smoke", "tornado_damage", "power_outage", "extreme_heat", "chemical_spill", "winter_storm"];

const customers = [];
for (let i = 1; i <= 5000; i++) {
  const place = pick(cities);
  const age = Math.floor(num(3, 96));
  const disabilities = pickMany(disabilityTypes, 1, 3).filter((item) => item !== "none");
  const conditions = pickMany(medicalConditions, 1, 4);
  const meds = pickMany(medications, 1, 3);
  const equip = pickMany(equipment, 1, 3);
  const powerDependency = equip.some((x) => ["CPAP", "dialysis machine", "power chair", "portable oxygen concentrator"].includes(x));
  const oxygenDependency = equip.includes("portable oxygen concentrator") || meds.includes("oxygen") || conditions.includes("COPD");
  const mobilityNeed = disabilities.includes("mobility") || equip.some((x) => ["wheelchair", "walker", "cane", "power chair"].includes(x));
  const criticalCondition = conditions.some((x) => ["COPD", "kidney disease", "epilepsy", "heart disease", "pregnancy", "dementia"].includes(x));
  const baseScore =
    15 +
    (age >= 75 ? 18 : age <= 12 ? 12 : 0) +
    (powerDependency ? 16 : 0) +
    (oxygenDependency ? 20 : 0) +
    (mobilityNeed ? 14 : 0) +
    (criticalCondition ? 15 : 0) +
    (disabilities.includes("hearing") || disabilities.includes("visual") ? 8 : 0) +
    Math.floor(num(0, 14));

  customers.push({
    customer_id: id("CUST-", i),
    signal_id: id("SIG-", i, 7),
    first_name: pick(firstNames),
    last_name: pick(lastNames),
    age,
    gender: pick(["female", "male", "nonbinary", "prefer_not_to_say"]),
    phone: `+1-555-${String(Math.floor(num(100, 999))).padStart(3, "0")}-${String(Math.floor(num(1000, 9999))).padStart(4, "0")}`,
    email: `customer${i}@example.org`,
    address_line_1: `${Math.floor(num(100, 9999))} ${pick(streets)} ${pick(["St", "Ave", "Rd", "Blvd", "Ln"])}`,
    city: place.city,
    state: place.state,
    zip_code: String(Math.floor(num(70000, 79999))),
    latitude: num(place.lat - 0.28, place.lat + 0.28, 6),
    longitude: num(place.lon - 0.28, place.lon + 0.28, 6),
    household_size: Math.floor(num(1, 7)),
    lives_alone: bool(0.32),
    primary_language: pick(languages),
    communication_needs: pickMany(["plain_language", "large_print", "ASL", "captioning", "text_only", "translator", "none"], 1, 2),
    disability_types: disabilities.length ? disabilities : ["none"],
    mobility_level: pick(["independent", "limited_walking", "needs_transfer_help", "non_ambulatory", "bed_bound"]),
    medical_conditions: conditions,
    medications,
    equipment_dependencies: equip,
    power_dependent_equipment: powerDependency,
    oxygen_dependent: oxygenDependency,
    service_animal: bool(0.08),
    needs_accessible_transport: mobilityNeed || bool(0.12),
    evacuation_assistance_level: pick(["none", "low", "medium", "high", "critical"]),
    preferred_hospital: pick(["Memorial General", "County Medical Center", "St. Anne Hospital", "University Health", "Regional Clinic"]),
    caregiver_name: bool(0.52) ? `${pick(firstNames)} ${pick(lastNames)}` : "",
    caregiver_phone: bool(0.52) ? `+1-555-${String(Math.floor(num(100, 999))).padStart(3, "0")}-${String(Math.floor(num(1000, 9999))).padStart(4, "0")}` : "",
    emergency_contact_name: `${pick(firstNames)} ${pick(lastNames)}`,
    emergency_contact_phone: `+1-555-${String(Math.floor(num(100, 999))).padStart(3, "0")}-${String(Math.floor(num(1000, 9999))).padStart(4, "0")}`,
    consent_to_share_with_responders: bool(0.93),
    baseline_priority_score: Math.min(baseScore, 100),
    notes: pick(["requires calm communication", "avoid stairs if possible", "check medication access", "may need family notification", "prefers text updates", "none"]),
  });
}

const responders = [];
for (let i = 1; i <= 1200; i++) {
  const place = pick(cities);
  const profession = pick(professions);
  responders.push({
    responder_id: id("RESP-", i),
    first_name: pick(firstNames),
    last_name: pick(lastNames),
    profession,
    agency: pick(agencies),
    certification_tags: pickMany(certs, 2, 5),
    languages: pickMany(languages, 1, 3),
    vehicle_type: pick(vehicles),
    wheelchair_accessible_vehicle: bool(profession === "evacuation_driver" ? 0.7 : 0.16),
    can_transport_patient: bool(0.42),
    can_handle_oxygen_support: bool(["paramedic", "EMT", "nurse", "physician"].includes(profession) ? 0.75 : 0.18),
    can_handle_mobility_transfer: bool(0.45),
    mental_health_trained: bool(["mental_health_crisis", "social_worker", "police"].includes(profession) ? 0.8 : 0.2),
    max_case_load: Math.floor(num(1, 7)),
    current_case_load: Math.floor(num(0, 5)),
    status: pick(statuses),
    staging_city: place.city,
    latitude: num(place.lat - 0.22, place.lat + 0.22, 6),
    longitude: num(place.lon - 0.22, place.lon + 0.22, 6),
    phone: `+1-555-${String(Math.floor(num(100, 999))).padStart(3, "0")}-${String(Math.floor(num(1000, 9999))).padStart(4, "0")}`,
    radio_channel: `CH-${Math.floor(num(1, 24))}`,
    shift_start_local: `${String(Math.floor(num(0, 23))).padStart(2, "0")}:00`,
    shift_end_local: `${String(Math.floor(num(0, 23))).padStart(2, "0")}:00`,
  });
}

const zones = [];
for (let i = 1; i <= 180; i++) {
  const place = pick(cities);
  const severity = Math.floor(num(1, 6));
  zones.push({
    zone_id: id("ZONE-", i, 4),
    city: place.city,
    state: place.state,
    incident_type: pick(zoneTypes),
    severity_level: severity,
    center_latitude: num(place.lat - 0.2, place.lat + 0.2, 6),
    center_longitude: num(place.lon - 0.2, place.lon + 0.2, 6),
    radius_miles: num(0.5, 12, 1),
    power_outage: bool(severity >= 3 ? 0.66 : 0.2),
    road_access: pick(["open", "limited", "blocked", "unknown"]),
    cell_service_quality: pick(["good", "degraded", "poor", "offline"]),
    shelter_capacity_pressure: pick(["low", "medium", "high", "overflow"]),
    updated_at: `2026-05-${String(Math.floor(num(1, 3))).padStart(2, "0")}T${String(Math.floor(num(0, 23))).padStart(2, "0")}:${String(Math.floor(num(0, 59))).padStart(2, "0")}:00-05:00`,
  });
}

const shelters = [];
for (let i = 1; i <= 220; i++) {
  const place = pick(cities);
  shelters.push({
    shelter_id: id("SHEL-", i, 4),
    name: `${pick(["North", "South", "Central", "West", "East", "Community", "Regional"])} ${pick(["High School", "Civic Center", "Community Center", "Church", "Arena", "Clinic"])} Shelter`,
    city: place.city,
    state: place.state,
    latitude: num(place.lat - 0.18, place.lat + 0.18, 6),
    longitude: num(place.lon - 0.18, place.lon + 0.18, 6),
    total_capacity: Math.floor(num(60, 900)),
    available_beds: Math.floor(num(0, 420)),
    wheelchair_accessible: bool(0.72),
    medical_staff_available: bool(0.48),
    oxygen_available: bool(0.38),
    pet_friendly: bool(0.36),
    service_animals_supported: true,
    backup_power: bool(0.62),
    languages_supported: pickMany(languages, 1, 4),
    intake_status: pick(["open", "limited", "medical_only", "full"]),
  });
}

const historicalCases = [];
function recommendProfession(customer, incidentType) {
  const conditionsText = String(customer.medical_conditions).toLowerCase();
  const disabilityText = String(customer.disability_types).toLowerCase();
  const equipmentText = String(customer.equipment_dependencies).toLowerCase();
  const needsMedical =
    customer.oxygen_dependent ||
    conditionsText.includes("copd") ||
    conditionsText.includes("heart disease") ||
    conditionsText.includes("epilepsy") ||
    conditionsText.includes("pregnancy") ||
    equipmentText.includes("oxygen");
  const needsTransfer =
    customer.needs_accessible_transport ||
    disabilityText.includes("mobility") ||
    equipmentText.includes("wheelchair") ||
    equipmentText.includes("walker") ||
    equipmentText.includes("power chair");
  const needsMentalHealth =
    disabilityText.includes("mental_health") ||
    conditionsText.includes("ptsd") ||
    conditionsText.includes("dementia");
  const needsCommunication =
    disabilityText.includes("hearing") ||
    String(customer.communication_needs).includes("ASL");

  if (incidentType === "chemical_spill") return pick(["firefighter", "paramedic", "search_and_rescue"]);
  if (incidentType === "wildfire_smoke" && needsMedical) return pick(["paramedic", "EMT", "nurse"]);
  if (incidentType === "power_outage" && customer.power_dependent_equipment) return pick(["paramedic", "utility_technician", "nurse"]);
  if (incidentType === "flood" && needsTransfer) return pick(["evacuation_driver", "search_and_rescue", "firefighter"]);
  if (incidentType === "tornado_damage" && needsTransfer) return pick(["search_and_rescue", "firefighter", "evacuation_driver"]);
  if (needsMedical) return pick(["paramedic", "EMT", "nurse", "physician"]);
  if (needsMentalHealth) return pick(["mental_health_crisis", "social_worker"]);
  if (needsCommunication) return "ASL_interpreter";
  if (needsTransfer) return pick(["evacuation_driver", "EMT"]);
  return pick(["EMT", "social_worker", "police"]);
}

for (let i = 1; i <= 20000; i++) {
  const customer = pick(customers);
  const responseMinutes = Math.floor(num(4, 180));
  const severity = Math.floor(num(1, 6));
  const incidentType = pick(zoneTypes);
  const priorityScore = Math.min(100, customer.baseline_priority_score + severity * 4 + Math.floor(num(-10, 12)));
  historicalCases.push({
    case_id: id("CASE-", i, 7),
    customer_id: customer.customer_id,
    signal_id: customer.signal_id,
    incident_type: incidentType,
    received_at: `2025-${String(Math.floor(num(1, 12))).padStart(2, "0")}-${String(Math.floor(num(1, 28))).padStart(2, "0")}T${String(Math.floor(num(0, 23))).padStart(2, "0")}:${String(Math.floor(num(0, 59))).padStart(2, "0")}:00-06:00`,
    priority_score_assigned: priorityScore,
    matched_responder_profession: recommendProfession(customer, incidentType),
    response_time_minutes: responseMinutes,
    outcome: pick(["resolved_on_scene", "transported_to_shelter", "transported_to_hospital", "unable_to_reach_first_attempt", "referred_to_social_services"]),
    escalation_required: priorityScore >= 82 || severity >= 5 || (responseMinutes > 100 && priorityScore >= 70),
  });
}

writeCsv("customers.csv", customers);
writeCsv("responders.csv", responders);
writeCsv("disaster_zones.csv", zones);
writeCsv("shelters.csv", shelters);
writeCsv("historical_cases.csv", historicalCases);

const schema = {
  backend_lookup_flow: [
    "Receive signal_id from device/tag.",
    "Create received_at timestamp in backend.",
    "Find customer by customers.signal_id.",
    "Combine customer needs with disaster_zones, shelters, and responder availability.",
    "Run prioritization model and responder matching model.",
    "Show AI dispatch dashboard with ranked cases and responder assignment options.",
  ],
  files: {
    "customers.csv": "Fake disabled/customer registry. signal_id is the device id and maps directly to customer_id.",
    "responders.csv": "First responders, professions, certifications, location, availability, vehicle, and capability columns.",
    "disaster_zones.csv": "Simulated real-world incident context that the model can use for risk scoring.",
    "shelters.csv": "Shelter capacity and accessibility resources.",
    "historical_cases.csv": "Large training/testing set for prediction experiments and accuracy checks.",
  },
  recommended_targets: {
    priority_prediction_label: "historical_cases.priority_score_assigned or escalation_required",
    responder_matching_label: "historical_cases.matched_responder_profession",
    lookup_key: "customers.signal_id",
  },
};
writeFileSync(join(outDir, "schema_notes.json"), `${JSON.stringify(schema, null, 2)}\n`);

console.log(`Generated ${customers.length} customers`);
console.log(`Generated ${responders.length} responders`);
console.log(`Generated ${zones.length} disaster zones`);
console.log(`Generated ${shelters.length} shelters`);
console.log(`Generated ${historicalCases.length} historical cases`);
