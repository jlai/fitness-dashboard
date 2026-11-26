import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
