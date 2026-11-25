import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const keyDirectory = "/home/node/.fitness-dashboard-keys";
await mkdir(keyDirectory, { recursive: true, mode: 0o700 });

const keyDefinitions = [
  ["SESSION_ACTIVE_KEY", "session", "HS256", "sig"],
  ["HEALTH_ACTIVE_KEY", "health", "A256GCM", "enc"],
  ["DRIVE_ACTIVE_KEY", "drive", "A256GCM", "enc"],
];

for (const [environmentName, fileName, algorithm, use] of keyDefinitions) {
  if (process.env[environmentName]) continue;

  const keyPath = join(keyDirectory, `${fileName}.json`);
  let jwk;
  try {
    jwk = JSON.parse(await readFile(keyPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    jwk = {
      kty: "oct",
      kid: `${fileName}-${randomUUID()}`,
      alg: algorithm,
      use,
      k: randomBytes(32).toString("base64url"),
    };
    await writeFile(keyPath, `${JSON.stringify(jwk)}\n`, {
      mode: 0o600,
      flag: "wx",
    });
  }

  process.env[environmentName] = JSON.stringify(jwk);
}

const mode = process.env.NODE_ENV ?? "development";
if (mode !== "development" && mode !== "production") {
  throw new Error(`Unsupported NODE_ENV: ${mode}`);
}

function runNpmScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn("npm", ["run", script, ...args], {
      stdio: "inherit",
      env: process.env,
    });
    processHandle.on("error", reject);
    processHandle.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

try {
  if (mode === "production") {
    const buildExitCode = await runNpmScript("build");
    if (buildExitCode !== 0) process.exit(buildExitCode);
  }

  const serverExitCode = await runNpmScript(
    mode === "production" ? "start" : "dev",
  );
  process.exitCode = serverExitCode;
} catch (error) {
  console.error("Failed to start the dashboard:", error.message);
  process.exitCode = 1;
}
