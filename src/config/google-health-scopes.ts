/**
 * Google Health API OAuth scopes.
 * See https://developers.google.com/health/scopes
 */

const SCOPE_PREFIX = "https://www.googleapis.com/auth/googlehealth";

export const ACTIVITY_AND_FITNESS_READONLY = `${SCOPE_PREFIX}.activity_and_fitness.readonly`;
export const ACTIVITY_AND_FITNESS_WRITEONLY = `${SCOPE_PREFIX}.activity_and_fitness.writeonly`;
export const ECG_READONLY = `${SCOPE_PREFIX}.ecg.readonly`;
export const HEALTH_METRICS_AND_MEASUREMENTS_READONLY = `${SCOPE_PREFIX}.health_metrics_and_measurements.readonly`;
export const HEALTH_METRICS_AND_MEASUREMENTS_WRITEONLY = `${SCOPE_PREFIX}.health_metrics_and_measurements.writeonly`;
export const IRN_READONLY = `${SCOPE_PREFIX}.irn.readonly`;
export const LOCATION_READONLY = `${SCOPE_PREFIX}.location.readonly`;
export const LOGGED_SYMPTOMS_WRITEONLY = `${SCOPE_PREFIX}.logged_symptoms.writeonly`;
export const MINDFULNESS_WRITEONLY = `${SCOPE_PREFIX}.mindfulness.writeonly`;
export const NUTRITION_READONLY = `${SCOPE_PREFIX}.nutrition.readonly`;
export const NUTRITION_WRITEONLY = `${SCOPE_PREFIX}.nutrition.writeonly`;
export const PROFILE_READONLY = `${SCOPE_PREFIX}.profile.readonly`;
export const PROFILE_WRITEONLY = `${SCOPE_PREFIX}.profile.writeonly`;
export const REPRODUCTIVE_HEALTH_WRITEONLY = `${SCOPE_PREFIX}.reproductive_health.writeonly`;
export const SETTINGS_READONLY = `${SCOPE_PREFIX}.settings.readonly`;
export const SETTINGS_WRITEONLY = `${SCOPE_PREFIX}.settings.writeonly`;
export const SLEEP_READONLY = `${SCOPE_PREFIX}.sleep.readonly`;
export const SLEEP_WRITEONLY = `${SCOPE_PREFIX}.sleep.writeonly`;

/** Scopes requested at login — every Google Health API scope (read and write). */
export const REQUESTED_SCOPES = [
  ACTIVITY_AND_FITNESS_READONLY,
  ACTIVITY_AND_FITNESS_WRITEONLY,
  HEALTH_METRICS_AND_MEASUREMENTS_READONLY,
  HEALTH_METRICS_AND_MEASUREMENTS_WRITEONLY,
  NUTRITION_READONLY,
  NUTRITION_WRITEONLY,
  PROFILE_READONLY,
  SETTINGS_READONLY,
  SLEEP_READONLY,
  SLEEP_WRITEONLY,
] as const;

export type GoogleHealthScope = (typeof REQUESTED_SCOPES)[number];
