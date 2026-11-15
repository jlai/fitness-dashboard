const LOG_BUFFER_LIMIT = 20;

type LogListener = () => void;

let logBuffer: string[] = [];
const listeners = new Set<LogListener>();

function formatLogPart(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return `${value}n`;
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

export function log(...values: unknown[]): void {
  console.log(...values);
  if (typeof window === "undefined") return;

  const message = `${new Date().toISOString()} ${values.map(formatLogPart).join(" ")}`;
  logBuffer = [...logBuffer, message].slice(-LOG_BUFFER_LIMIT);
  listeners.forEach((listener) => listener());
}

export function getLogMessages(): readonly string[] {
  return logBuffer;
}

export function subscribeToLogs(listener: LogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
