import { randomBytes, randomUUID } from "node:crypto";

const purposes = [
  { name: "SESSION", alg: "HS256", use: "sig" },
  { name: "HEALTH", alg: "A256GCM", use: "enc" },
  { name: "DRIVE", alg: "A256GCM", use: "enc" },
];

for (const { name, alg, use } of purposes) {
  const jwk = {
    kty: "oct",
    kid: randomUUID(),
    alg,
    use,
    k: randomBytes(32).toString("base64url"),
    iat: Math.floor(Date.now() / 1000),
  };

  console.log(`${name}_ACTIVE_KEY=${JSON.stringify(jwk)}`);
}
