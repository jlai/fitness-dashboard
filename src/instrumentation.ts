export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { assertServerEnv } = await import("./server/auth/env");
  assertServerEnv();
}
