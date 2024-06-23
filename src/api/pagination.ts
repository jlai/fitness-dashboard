export function zonelessTimestamp(date: Date) {
  return date.toISOString().replace("Z", "");
}

// Get query string without ?
export function getQueryString(url: string) {
  return new URL(url).search.replace(/^\?/, "");
}
