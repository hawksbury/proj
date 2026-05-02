const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DISPATCH_API = process.env.DISPATCH_API_URL || "http://localhost:4000";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static("public"));

const csvPath = path.join(__dirname, "data.csv");
const customersPath = path.join(__dirname, "..", "data", "customers.csv");

function loadCustomers() {
  try {
    const data = fs.readFileSync(customersPath, "utf8");
    const lines = data.trim().split("\n");
    const headers = lines[0].split(",");
    const customers = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const customer = {};
      headers.forEach((header, idx) => {
        customer[header.trim()] = values[idx]?.trim();
      });
      customers.push(customer);
    }
    return customers;
  } catch (err) {
    console.error("Failed to load customers:", err.message);
    return [];
  }
}

const customers = loadCustomers();
console.log(`Loaded ${customers.length} customers from registry`);

function randomRow() {
  const now = new Date();
  const received_time = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  let person_id, latitude, longitude;

  if (customers.length > 0) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    person_id = customer.signal_id;
    latitude = customer.latitude;
    longitude = customer.longitude;
  } else {
    person_id = `SCRBS-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    latitude = (30.25 + Math.random() * 0.5).toFixed(4);
    longitude = (-97.75 + Math.random() * 0.5).toFixed(4);
  }

  return { received_time, person_id, latitude, longitude };
}

async function createAlert(res, isGet = false) {
  const fileExists = fs.existsSync(csvPath);
  if (!fileExists) {
    fs.writeFileSync(csvPath, "received_time\tperson_id\tlatitude\tlongitude\n");
  }

  const rowData = randomRow();
  const rowLine = `${rowData.received_time}\t${rowData.person_id}\t${rowData.latitude}\t${rowData.longitude}\n`;
  fs.appendFileSync(csvPath, rowLine);

  let enriched = null;
  try {
    const apiResponse = await fetch(`${DISPATCH_API}/api/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rowData),
    });
    if (apiResponse.ok) {
      enriched = await apiResponse.json();
    }
  } catch (_err) {
    // Dispatch backend unavailable — proceed without enrichment
  }

  if (isGet) {
    // Plain text response for Pico / App Script compatibility
    res.type("text").send(`OK ${rowData.person_id}`);
  } else {
    res.json({ message: "Row added successfully", row: rowLine.trim(), enriched });
  }
}

// Browser button (used by public/index.html)
app.post("/add-row", (req, res) => createAlert(res, false));

// Pico / GET-based trigger (replaces Google Apps Script doGet)
app.get("/api/button", (req, res) => createAlert(res, true));

app.get("/get-rows", (req, res) => {
  if (!fs.existsSync(csvPath)) return res.json([]);
  const data = fs.readFileSync(csvPath, "utf8");
  const lines = data.trim().split("\n");
  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => {
    const values = line.split("\t");
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {});
  });
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Button API running at http://localhost:${PORT}`);
  console.log(`  Browser button: POST /add-row`);
  console.log(`  Pico trigger:   GET  /api/button`);
  console.log(`  Dispatch API:   ${DISPATCH_API}`);
});
