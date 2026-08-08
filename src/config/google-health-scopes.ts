/**
 * Google Health API OAuth scopes.
 * See https://developers.google.com/health/scopes
 */

const SCOPE_PREFIX = "https://www.googleapis.com/auth/googlehealth.";

function healthScope(suffix: string) {
  return `${SCOPE_PREFIX}${suffix}`;
}

const ACTIVITY_AND_FITNESS = [
  "activity_and_fitness.readonly",
  "activity_and_fitness.writeonly",
];

const HEALTH_METRICS = [
  "health_metrics_and_measurements.readonly",
  "health_metrics_and_measurements.writeonly",
];

const NUTRITION = ["nutrition.readonly", "nutrition.writeonly"];
const PROFILE = ["profile.readonly", "profile.writeonly"];
const SETTINGS = ["settings.readonly", "settings.writeonly"];
const SLEEP = ["sleep.readonly", "sleep.writeonly"];

/** Every Google Health API scope, both read and write. */
const ALL_HEALTH_SCOPE_SUFFIXES = [
  ...ACTIVITY_AND_FITNESS,
  ...HEALTH_METRICS,
  ...NUTRITION,
  ...PROFILE,
  ...SETTINGS,
  ...SLEEP,
  "ecg.readonly",
  "irn.readonly",
  "location.readonly",
  "logged_symptoms.writeonly",
  "mindfulness.writeonly",
  "reproductive_health.writeonly",
];

/** Scopes requested at login — every Google Health API scope (read and write). */
export const REQUESTED_SCOPES = ALL_HEALTH_SCOPE_SUFFIXES.map(healthScope);

/**
 * The dashboard gates features on Fitbit's short scope names (e.g. "act").
 * Map each one to the Google Health scopes covering the same data, following
 * https://developers.google.com/health/migration/api-specifications
 */
const SCOPE_KEY_TO_HEALTH_SCOPES: Record<string, Array<string>> = {
  act: ACTIVITY_AND_FITNESS,
  cf: ACTIVITY_AND_FITNESS,
  hr: HEALTH_METRICS,
  oxy: HEALTH_METRICS,
  res: HEALTH_METRICS,
  tem: HEALTH_METRICS,
  wei: HEALTH_METRICS,
  nut: NUTRITION,
  pro: PROFILE,
  set: SETTINGS,
  sle: SLEEP,
  loc: ["location.readonly"],
};

/**
 * Translate the scopes the user actually granted into the short scope names
 * used throughout the dashboard.
 */
export function toScopeKeys(grantedScopes: Iterable<string>) {
  const granted = new Set(grantedScopes);
  const scopeKeys = new Set<string>();

  for (const [scopeKey, healthScopes] of Object.entries(
    SCOPE_KEY_TO_HEALTH_SCOPES
  )) {
    if (healthScopes.some((suffix) => granted.has(healthScope(suffix)))) {
      scopeKeys.add(scopeKey);
    }
  }

  return scopeKeys;
}
