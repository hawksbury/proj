# AI Disaster Response — Priority Dispatch for People with Disabilities

> **When disaster strikes, people with disabilities face two crises at once: the disaster itself and the immediate loss of the support systems keeping them alive.** This system gives emergency responders real-time, ranked visibility into who needs help first — and exactly what they need to survive.

---

## The Problem

During disasters, people with disabilities face disproportionate risk:

- **Power outages** disable oxygen concentrators, dialysis machines, ventilators, and infusion pumps — often within hours
- **Standard emergency protocols** don't account for wheelchair users, non-verbal patients, or individuals who require specialized transport
- **Responders arrive without context** — they don't know the patient needs a lift transfer, speaks only Arabic, or requires an accessible vehicle before they can even evacuate
- **Aid is delayed or misprioritized** because there is no ranked queue; everyone looks equally urgent on a radio call

The result: preventable deaths.

---

## The Solution

A real-time AI dispatch system that:

1. **Receives a live distress signal** from a patient's personal alert device
2. **Instantly matches it** to a disability registry record containing medical, mobility, communication, and equipment details
3. **Scores and ranks the alert** using a composite urgency model — so the most critical patients always surface to the top
4. **Briefs the responder** before they leave: what equipment is needed, what language is spoken, what vehicle is required, and who to contact
5. **Explains every number** — responders and supervisors can see exactly why each patient scored what they scored

---

## Live Demo Flow

```
Patient presses button
       ↓
ButtonAPI (port 3001) generates SCRBS-XXXX signal
       ↓
Disaster Response Backend (port 4000) looks up registry record
       ↓
Composite priority score computed (0–100)
       ↓
Alert inserted into live queue, sorted by score
       ↓
Frontend re-sorts in real time (animated), responder clicks to see full brief
       ↓
ML pipeline runs: escalation probability, priority regression, responder profession match
       ↓
LLM (OpenAI) generates dispatcher narrative with risk chips and recommended action
```

---

## Key Features

### Real-Time Priority Queue
- New alerts animate into position as they arrive — responders watch the queue re-rank live
- Each row shows: priority level badge (CRITICAL / HIGH / MEDIUM / LOW), composite score, patient name, location, and need tags (O₂, Power Equip, ASL, Transfer, Accessible)
- Expanding a row shows the full **Responder Brief** — everything needed before departure

### Composite Urgency Scoring
Every patient in the registry receives a baseline score (0–100) reflecting pre-assessed vulnerability. At alert time, the system adds specific, real-world bonuses:

| Factor | Points | Why |
|--------|--------|-----|
| Oxygen dependent | +25 | Power loss = respiratory failure within hours |
| Power-dependent equipment | +20 | Dialysis, ventilator, CPAP — cannot function without power |
| Critical evacuation level | +15 | Requires specialized transport and heavy coordination |
| High evacuation level | +10 | Cannot self-evacuate |
| Needs physical transfer | +10 | Cannot move independently |
| Lives alone | +8 | No one on-site; response gap is wider |
| Non-ambulatory | +8 | Mobility equipment required |
| Accessible transport required | +5 | Standard vehicles unusable |
| ASL interpreter required | +5 | Arranging interpreter adds coordination time |
| Wheelchair user | +5 | Accessible vehicle must be sourced |
| Language translator required | +3 | Communication delay increases response time |
| Limited walking ability | +3 | Extra physical assistance needed |
| Service animal | +3 | Transport and shelter must accommodate |

All scores are capped at 100. Levels: **CRITICAL** ≥90 · **HIGH** ≥75 · **MEDIUM** ≥55 · **LOW** <55

### Machine Learning Pipeline (scikit-learn)
Three trained models, evaluated on 20,000 synthetic historical cases:

| Model | Task | Performance |
|-------|------|-------------|
| Escalation classifier | Will this case require escalation? | F1: **0.881** · ROC-AUC: **0.877** |
| Priority regressor | What is the 0–100 urgency score? | R²: **0.801** · MAE: 5.4 |
| Responder profession classifier | Which profession should respond? | Top-3 accuracy: **87.9%** |

Features include: age, disability types, medical conditions, equipment dependencies, mobility level, evacuation level, incident type, communication needs, time of day, and location.

### LLM Dispatch Narrative (OpenAI)
When an OpenAI API key is configured, the system generates a structured narrative for each signal containing:
- Plain-English risk summary
- Key risk factor chips
- Recommended action
- Responder reasoning (why each ranked responder is the right match)

Falls back to a rule-based mock summary if the API is unavailable — the system never fails silently.

### Responder Brief (Actionable, Not Just Data)
Every expanded alert shows:
- **Score breakdown**: base score + each bonus factor with explanation
- **Prepare for**: equipment, transport, and communication items the responder needs before arrival
- **Patient profile**: age, gender, mobility, evacuation classification, household situation
- **Medical**: conditions, medications, equipment dependencies
- **Contacts**: caregiver and emergency contact with tap-to-call links
- **Notes**: any freeform registry notes

### In-App Scoring Guide
Collapsible documentation inside the live queue explains:
- What each priority level means and what response time it demands
- Every scoring factor and the real-world reason it raises urgency
- Four worked examples using patients from the live registry, with step-by-step score math

---

## Architecture

```
buttonapi/          ← Express.js alert simulator (port 3001)
  server.js         ← POST /add-row (browser) · GET /api/button (Pico)
  public/index.html ← Browser-based signal simulator UI
  data.csv          ← Append-only distress log
  pico/main.py      ← MicroPython for Raspberry Pi Pico W

backend/            ← Node.js HTTP API (port 4000)
  server.js         ← Routes, CORS, JSON parsing
  routes/
    alertRoutes.js  ← Live queue: computePriority(), POST /api/alert, GET /api/alerts
    dispatchRoutes.js ← Full ML dispatch: signal lookup → ML → LLM → response
    signalRoutes.js ← Signal/customer lookup endpoints
  services/
    dataService.js          ← CSV loader and in-memory cache
    signalLookupService.js  ← Matches signal_id to customer record
    priorityService.js      ← Calls Python ML predictor via child_process
    responderMatchingService.js ← Haversine distance ranking + capability scoring
    llmDispatchService.js   ← OpenAI Responses API with structured JSON schema

backend/ml/         ← Python scikit-learn (train separately)
  train_models.py   ← Trains all three models, writes metrics.json
  predict_dispatch.py ← Live prediction endpoint called by Node
  ml_common.py      ← Shared feature engineering
  models/           ← Saved .joblib model files

data/               ← Synthetic registry (5,000 patients)
  customers.csv     ← Disability registry with signal_id = SCRBS-XXXX
  responders.csv    ← First responder profiles with location and capabilities
  historical_cases.csv ← 20,000 training cases for ML models
  disaster_zones.csv, shelters.csv

frontend/           ← React 19 + Vite (port 5173)
  src/
    App.jsx                   ← Shell: polling, alert state, responder auth
    components/
      AlertQueue.jsx          ← Live priority queue with FLIP animation
      ScoringGuide.jsx        ← In-app scoring documentation
      PriorityDashboard.jsx   ← ML visualization: gauge, risk bars, metrics
      DispatchSummary.jsx     ← LLM narrative widget
      ResponderCaseQueue.jsx  ← Pre-loaded case queue with popovers
      ResponderAnalytics.jsx  ← Analytics for logged-in responder
      LoginPage.jsx, ResponderLogin.jsx
```

---

## How to Run

### 1. Install and start the backend

```bash
cd backend
npm install
cp .env.example .env          # Add OPENAI_API_KEY for LLM summaries (optional)
npm start                     # Starts on port 4000
```

### 2. Train ML models (first time only)

```bash
pip install -r backend/ml/requirements.txt
python backend/ml/train_models.py
```

### 3. Start the button simulator

```bash
cd buttonapi
npm install
npm start                     # Starts on port 3001
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev                   # Opens on http://127.0.0.1:5173
```

### 5. (Optional) Flash the Raspberry Pi Pico W

The Pico replaces the Google Sheets trigger with a direct call to the local server.

1. Open `buttonapi/pico/main.py` in Thonny
2. Set `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_IP` (your machine's LAN IP — run `ipconfig` on Windows)
3. Flash the file to the Pico as `main.py`
4. When the Pico boots and connects to WiFi, pressing the physical button sends `GET /api/button` to the local buttonapi — identical to clicking the browser button

The Pico signals the server over your local network; no Google account or internet required.

### 6. Demo the live flow

- Visit `http://127.0.0.1:5173` and log in as any responder
- Open `http://localhost:3001` in a second tab (or press the physical Pico button)
- Watch the priority queue receive and rank the new alert in real time with FLIP animation
- Click any alert row to expand the full responder brief
- Use the signal input to load a full ML dispatch for any `SCRBS-XXXX` ID

---

## API Reference

```
GET  /health
POST /api/alert          { person_id, received_time?, latitude?, longitude? }
GET  /api/alerts
POST /api/signals        { signal_id, incident_type }
GET  /api/signals/:id
GET  /api/responders
POST /api/dispatch       { signal_id, incident_type, limit? }
GET  /api/dispatch/:id?incident_type=power_outage&limit=3
```

---

## Judging Criteria

### Impactful
People with oxygen concentrators or dialysis machines have a window of hours — sometimes less — before a power outage becomes fatal. This system ensures those patients are never buried in a generic queue. The composite scoring model is grounded in real emergency management priorities: life-critical equipment first, then evacuation complexity, then communication barriers. Every dispatch decision is explainable, auditable, and actionable.

### Functional
- Working end-to-end prototype: button press → enriched alert → ranked queue → responder brief
- Three trained ML models with measurable performance (F1 0.881, R² 0.801, Top-3 accuracy 87.9%)
- LLM integration with OpenAI structured output and a graceful local fallback
- Real-time frontend polling with animated queue reordering and in-app notifications

### Inclusive
The system is built *specifically* for people with disabilities. Every scoring factor — oxygen dependency, wheelchair use, ASL communication, accessible transport — exists because these are the exact factors that cause standard triage to fail this population. The responder brief surfaces language, equipment, and mobility needs before the responder even leaves. The scoring guide explains each factor in plain English so no one is treated as a black-box number.

### Original
Most emergency dispatch systems treat disability as a checkbox. This system treats it as a multi-dimensional urgency model with additive, interpretable factors. The combination of a real-time FLIP-animated priority queue, a client-side ML fallback, a fully explainable composite score with in-app documentation, and a per-responder capability-matched workflow is a new approach to this problem.

### Practical
The system mirrors real emergency management workflows: registry lookup, priority triage, responder assignment, pre-departure briefing. The data model (disability type, evacuation level, equipment dependencies, communication needs, caregiver contacts) matches fields used in real Special Needs Registries maintained by US counties. The button simulator represents real personal emergency response devices. The responder login and case queue reflect how real dispatch dashboards are organized by profession and shift.

---

## Data

All patient and responder data is **fully synthetic**, generated via `scripts/generate_fake_data.mjs`. No real patient data is used anywhere in this project.

The 5,000 synthetic customers cover a realistic distribution of disability types, mobility levels, equipment dependencies, languages, and geographic locations across Texas.
