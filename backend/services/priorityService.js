import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, "..");
const projectRoot = resolve(backendDir, "..");
const pythonExecutable = resolve(projectRoot, ".venv", "Scripts", "python.exe");

export function predictDispatch(signalId, { incidentType = "power_outage", limit = 5 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      pythonExecutable,
      [
        resolve(backendDir, "ml/predict_dispatch.py"),
        signalId,
        "--incident-type",
        incidentType,
        "--limit",
        String(limit),
      ],
      { cwd: projectRoot },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(Object.assign(new Error(stderr || "ML prediction failed"), { statusCode: 500 }));
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        reject(
          Object.assign(new Error(`ML prediction returned invalid JSON: ${error.message}`), {
            statusCode: 500,
          }),
        );
      }
    });
  });
}

export function prioritySort(a, b) {
  return (b.prediction?.priority_score ?? 0) - (a.prediction?.priority_score ?? 0);
}
