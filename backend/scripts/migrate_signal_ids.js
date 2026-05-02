import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, "../../data/customers.csv");

const content = readFileSync(csvPath, "utf8");

const updated = content.replace(/SIG-(\d{7})/g, (_, digits) => {
  const num = parseInt(digits, 10);
  return `SCRBS-${String(num % 10000).padStart(4, "0")}`;
});

writeFileSync(csvPath, updated, "utf8");

const count = (updated.match(/SCRBS-\d{4}/g) || []).length;
console.log(`Done. Updated ${count} signal IDs to SCRBS format.`);
