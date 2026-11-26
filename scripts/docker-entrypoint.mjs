import { spawn } from "node:child_process";
import "./docker-init-keys.mjs";

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
