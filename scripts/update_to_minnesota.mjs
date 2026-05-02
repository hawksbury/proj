import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "customers.csv");

const MN_CITIES = [
  { city: "Minneapolis",   state: "MN", zip: "55401", lat: 44.9778, lon: -93.2650, spread: 0.06 },
  { city: "Saint Paul",    state: "MN", zip: "55101", lat: 44.9537, lon: -93.0900, spread: 0.05 },
  { city: "Rochester",     state: "MN", zip: "55901", lat: 44.0121, lon: -92.4802, spread: 0.04 },
  { city: "Duluth",        state: "MN", zip: "55802", lat: 46.7867, lon: -92.1005, spread: 0.05 },
  { city: "Bloomington",   state: "MN", zip: "55420", lat: 44.8408, lon: -93.3477, spread: 0.03 },
  { city: "Brooklyn Park", state: "MN", zip: "55443", lat: 45.0941, lon: -93.3563, spread: 0.03 },
  { city: "Plymouth",      state: "MN", zip: "55441", lat: 45.0105, lon: -93.4555, spread: 0.03 },
  { city: "Saint Cloud",   state: "MN", zip: "56301", lat: 45.5579, lon: -94.1632, spread: 0.04 },
  { city: "Eagan",         state: "MN", zip: "55121", lat: 44.8041, lon: -93.1669, spread: 0.03 },
  { city: "Coon Rapids",   state: "MN", zip: "55433", lat: 45.1197, lon: -93.3113, spread: 0.03 },
  { city: "Burnsville",    state: "MN", zip: "55306", lat: 44.7677, lon: -93.2777, spread: 0.03 },
  { city: "Eden Prairie",  state: "MN", zip: "55344", lat: 44.8547, lon: -93.4708, spread: 0.03 },
  { city: "Maple Grove",   state: "MN", zip: "55311", lat: 45.0724, lon: -93.4558, spread: 0.03 },
  { city: "Woodbury",      state: "MN", zip: "55125", lat: 44.9239, lon: -92.9594, spread: 0.03 },
  { city: "Lakeville",     state: "MN", zip: "55044", lat: 44.6497, lon: -93.2427, spread: 0.03 },
  { city: "Blaine",        state: "MN", zip: "55434", lat: 45.1608, lon: -93.2349, spread: 0.03 },
  { city: "Minnetonka",    state: "MN", zip: "55345", lat: 44.9211, lon: -93.4687, spread: 0.03 },
  { city: "Mankato",       state: "MN", zip: "56001", lat: 44.1636, lon: -93.9994, spread: 0.04 },
  { city: "Moorhead",      state: "MN", zip: "56560", lat: 46.8738, lon: -96.7678, spread: 0.04 },
  { city: "Richfield",     state: "MN", zip: "55423", lat: 44.8833, lon: -93.2833, spread: 0.02 },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pickCity() {
  const c = MN_CITIES[Math.floor(Math.random() * MN_CITIES.length)];
  return {
    city: c.city,
    state: c.state,
    zip: c.zip,
    lat: (c.lat + rand(-c.spread, c.spread)).toFixed(6),
    lon: (c.lon + rand(-c.spread, c.spread)).toFixed(6),
  };
}

const raw   = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split("\n");
const header = lines[0];
const cols   = header.split(",");

const cityIdx = cols.indexOf("city");
const stateIdx = cols.indexOf("state");
const zipIdx   = cols.indexOf("zip_code");
const latIdx   = cols.indexOf("latitude");
const lonIdx   = cols.indexOf("longitude");

console.log(`Columns: city=${cityIdx} state=${stateIdx} zip=${zipIdx} lat=${latIdx} lon=${lonIdx}`);

const updated = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const vals = line.split(",");
  const mn   = pickCity();

  vals[cityIdx]  = mn.city;
  vals[stateIdx] = mn.state;
  vals[zipIdx]   = mn.zip;
  vals[latIdx]   = mn.lat;
  vals[lonIdx]   = mn.lon;

  updated.push(vals.join(","));
}

fs.writeFileSync(CSV_PATH, updated.join("\n") + "\n", "utf8");
console.log(`Done. Updated ${updated.length - 1} customers to Minnesota.`);
