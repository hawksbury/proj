# Setup & Operations Manual

Complete instructions for running the AI Disaster Response system from scratch.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and open the project](#2-clone-and-open-the-project)
3. [Backend API](#3-backend-api)
4. [ML Models](#4-ml-models)
5. [Button Simulator (ButtonAPI)](#5-button-simulator-buttonapi)
6. [Frontend Dashboard](#6-frontend-dashboard)
7. [Raspberry Pi Pico W](#7-raspberry-pi-pico-w)
8. [Running the full system](#8-running-the-full-system)
9. [Testing each component](#9-testing-each-component)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Install these before starting. Versions shown are what the project was built and tested on.

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20+ | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| Thonny IDE | latest | https://thonny.org (Pico only) |

Verify your installs:

```powershell
node --version     # should print v20.x.x
npm --version      # should print 10.x.x
python --version   # should print 3.11.x
```

---

## 2. Clone and open the project

```powershell
git clone <repo-url>
cd proj
```

The folder structure you'll be working with:

```
proj/
  backend/      ← Node.js API server      (port 4000)
  buttonapi/    ← Alert simulator          (port 3001)
  frontend/     ← React dashboard          (port 5173)
  data/         ← Patient registry CSVs
  buttonapi/pico/main.py  ← Pico W code
```

---

## 3. Backend API

The backend is the core server. It must be running before anything else works.

### Install dependencies

```powershell
cd backend
npm install
```

### Configure environment (optional — for LLM summaries)

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and add your OpenAI key:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.2
```

> If you skip this, the system still works fully — it uses a built-in fallback summary instead of the live LLM.

### Start the server

```powershell
npm start
```

Expected output:

```
Server listening on http://127.0.0.1:4000
```

### Verify it's running

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing | Select-Object StatusCode
```

Expected: `StatusCode: 200`

---

## 4. ML Models

The ML models must be trained once before the backend can serve priority scores and dispatch predictions. If the `.joblib` files already exist in `backend/ml/models/`, skip to step 5.

### Install Python dependencies

Run this from the project root:

```powershell
pip install -r backend/ml/requirements.txt
```

### Train the models

```powershell
python backend/ml/train_models.py
```

This takes 1–2 minutes. When finished you'll see a metrics summary printed to the terminal and three files created:

```
backend/ml/models/escalation_model.joblib
backend/ml/models/priority_model.joblib
backend/ml/models/responder_profession_model.joblib
backend/ml/models/metrics.json
```

### Verify a prediction works

```powershell
python backend/ml/predict_dispatch.py SCRBS-0001 --incident-type power_outage
```

Expected: a JSON block with `priority_score`, `escalation_probability`, and `recommended_responder_profession`.

---

## 5. Button Simulator (ButtonAPI)

The ButtonAPI simulates a patient pressing a personal emergency device. It writes the signal to a local CSV and forwards it to the backend in one step.

> **Important:** Always run this from the repo folder (`proj/buttonapi/`), not from any other location. The old Desktop version does not have the `/api/button` endpoint.

### Install dependencies

Open a **new terminal** (keep the backend terminal open):

```powershell
cd buttonapi
npm install
```

### Start the server

```powershell
npm start
```

Expected output:

```
Button API running at http://localhost:3001
  Browser button: POST /add-row
  Pico trigger:   GET  /api/button
  Dispatch API:   http://localhost:4000
  Loaded 5000 customers from registry
```

> If you see `Loaded 0 customers` the path to `data/customers.csv` is wrong. Make sure you are running from `proj/buttonapi/`.

### Test the endpoint

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/button" -UseBasicParsing | Select-Object StatusCode, Content
```

Expected:

```
StatusCode  Content
----------  -------
       200  OK SCRBS-2341
```

### Use the browser button

Open `http://localhost:3001` in a browser. Click **Send Distress Signal** — you'll see the patient name and score appear below the button, and the signal log table will update.

### Check the signal log

```powershell
Get-Content "buttonapi\data.csv"
```

Each button press appends one row:

```
received_time          person_id    latitude    longitude
5/2/2026 12:30:31      SCRBS-2149   29.555949   -98.650926
```

---

## 6. Frontend Dashboard

Open a **new terminal** (keep backend and buttonapi terminals open):

```powershell
cd frontend
npm install
npm run dev
```

Expected output:

```
  VITE ready in 312ms
  ➜  Local:   http://127.0.0.1:5173/
```

Open `http://127.0.0.1:5173` in a browser.

### Log in

Select any responder from the dropdown and click **Enter Dashboard**. The profile you pick filters the case queue and analytics to that responder's profession.

### What you'll see

| Section | What it does |
|---------|-------------|
| **Live Priority Queue** | Real-time alert list, re-ranked on every new signal. Click any row to expand the full responder brief. |
| **Scoring Guide** | Click "How priority scores are calculated" to read every factor with examples. |
| **Signal Input** | Manually enter a `SCRBS-XXXX` ID and incident type to run the full ML dispatch. |
| **Priority Dashboard** | ML gauge, escalation probability, and model metrics. |
| **Dispatch Summary** | LLM-generated narrative with risk chips and recommended action. |
| **Responder Analytics** | Incident breakdown and case statistics for the logged-in responder. |

---

## 7. Raspberry Pi Pico W

The Pico W sends a real HTTP request to the ButtonAPI when its physical button is pressed. This replaces the previous Google Sheets connection.

### What you need

- Raspberry Pi Pico W
- Micro-USB data cable (must be a **data** cable — charge-only cables will not work)
- Thonny IDE installed on your computer
- MicroPython firmware on the Pico (see below if not already installed)

### Check if MicroPython is installed

1. Connect the Pico via USB
2. Open Thonny → **Tools → Options → Interpreter**
3. Set interpreter to **MicroPython (Raspberry Pi Pico)**
4. If Thonny connects and shows a `>>>` prompt in the Shell panel, MicroPython is installed — skip to **Configure**.
5. If it shows a port error, continue to the next step.

### Install MicroPython (first-time only)

1. Hold the **BOOTSEL** button on the Pico (small white button on the board)
2. While holding it, plug the USB cable into your computer
3. Release BOOTSEL — a drive called `RPI-RP2` appears in Windows Explorer
4. Download the MicroPython firmware `.uf2` file for the **Pico W** (not Pico):
   `https://micropython.org/download/RPI_PICO_W/`
5. Drag the `.uf2` file onto the `RPI-RP2` drive
6. The drive disappears automatically — the Pico reboots into MicroPython
7. Open Thonny and check the Shell panel for a `>>>` prompt

### Find your machine's local IP address

The Pico needs to know your computer's IP address on your WiFi network to send signals to it.

```powershell
ipconfig
```

Look for **IPv4 Address** under your WiFi adapter — it will look like `192.168.1.42` or `10.x.x.x`.

### Configure the Pico code

Open `buttonapi/pico/main.py` in Thonny (File → Open → navigate to the file).

Edit the top three lines:

```python
WIFI_SSID     = "your_network_name"
WIFI_PASSWORD = "your_network_password"
SERVER_IP     = "192.168.1.42"   # ← your machine's IP from ipconfig
```

> `SERVER_PORT` stays `3001`. Do not change `SIGNAL_URL`.

### Flash to the Pico

1. In Thonny, click **File → Save as…**
2. When asked where to save, choose **Raspberry Pi Pico**
3. Name the file exactly `main.py` and click OK

The Pico will now run this code automatically on every boot.

### Test the Pico

1. Click the green **Run** button in Thonny (or unplug and replug the USB)
2. Watch the **Shell panel** at the bottom — you should see:
   ```
   Connecting to <your_ssid>…
   Connected: 10.145.10.228
   Ready. Press button to send distress signal.
   ```
3. Press the physical button on the Pico
4. Shell should print:
   ```
   Button pressed — sending signal…
   Response: OK SCRBS-4821
   ```
5. LED blinks **twice** = success. LED blinks once long = network error.

---

## 8. Running the Full System

Four terminals need to be open simultaneously:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `proj/backend` | `npm start` |
| 2 | `proj/buttonapi` | `npm start` |
| 3 | `proj/frontend` | `npm run dev` |
| 4 | Thonny | Run `main.py` on Pico |

### Startup order

Always start in this order:
1. Backend first (buttonapi needs it to forward alerts)
2. ButtonAPI second
3. Frontend third
4. Pico last (or any time after ButtonAPI is running)

### Demo flow

1. Open `http://127.0.0.1:5173` and log in
2. Press the physical Pico button (or click **Send Distress Signal** at `http://localhost:3001`)
3. Within 3 seconds, the alert appears in the **Live Priority Queue**
4. The queue animates and re-sorts by priority score
5. Click the alert row to expand the **Responder Brief**
6. Use the **Signal Input** to enter any `SCRBS-XXXX` ID for a full ML dispatch

---

## 9. Testing Each Component

### Test backend only

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing | Select-Object StatusCode
```

### Test alert creation directly

```powershell
$body = '{"person_id":"SCRBS-0001","received_time":"2026-01-01 10:00:00"}'
Invoke-WebRequest -Uri "http://localhost:4000/api/alert" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object Content
```

### Test full ML dispatch

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/dispatch/SCRBS-0001?incident_type=power_outage" -UseBasicParsing | Select-Object StatusCode
```

### Test ButtonAPI Pico endpoint

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/button" -UseBasicParsing | Select-Object StatusCode, Content
```

### Watch the signal log update live

```powershell
Get-Content "buttonapi\data.csv" -Wait
```

Press the button — new rows appear in real time.

---

## 10. Troubleshooting

### "Cannot GET /api/button"

You are running the old ButtonAPI from the Desktop. Stop it and start the one in the repo:

```powershell
# Find and kill the old process
netstat -ano | findstr :3001
# Note the PID from the last column, then:
Stop-Process -Id <PID> -Force

# Start the correct one
cd "proj/buttonapi"
npm start
```

### ButtonAPI shows "Loaded 0 customers"

The server can't find `data/customers.csv`. Make sure you started the server from `proj/buttonapi/`, not from a different directory.

### Pico shows "Not connected — attempting reconnect"

- Double-check `WIFI_SSID` and `WIFI_PASSWORD` in `main.py` — they are case-sensitive
- Make sure the Pico and your computer are on the **same WiFi network**
- Confirm `SERVER_IP` matches your machine's current IP (run `ipconfig` again — it can change)

### Pico LED blinks once long (network error)

The Pico connected to WiFi but couldn't reach the ButtonAPI:
- Confirm ButtonAPI is running: `Invoke-WebRequest -Uri "http://localhost:3001/api/button"`
- Confirm `SERVER_IP` and `SERVER_PORT` in `main.py` are correct
- Check your firewall isn't blocking port 3001 on your machine

### Pico "port not found" in Thonny

- Try a different USB cable — charge-only cables don't work
- Go to **Thonny → Tools → Options → Interpreter**, change the port from the dropdown to the correct COM port
- If no Pico port appears, hold BOOTSEL and replug — reinstall MicroPython firmware

### Alerts not appearing in the dashboard

- Check the backend is running (terminal 1 should show no errors)
- Open browser dev tools → Network tab → look for `/api/alerts` polling every 3 seconds
- If `/api/alerts` returns an empty array, the alert creation failed — check the backend terminal for errors

### ML dispatch returns an error

The Python models may not be trained yet. Run:

```powershell
python backend/ml/train_models.py
```

Then restart the backend.

### OpenAI summary shows "mock" mode

This is expected if no API key is set. To enable the live LLM:
1. Add `OPENAI_API_KEY=sk-...` to `backend/.env`
2. Restart the backend

The dashboard header shows **"OpenAI LLM"** or **"Local Fallback"** to indicate which mode is active.
