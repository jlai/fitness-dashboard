import {
  ACTIVITY_AND_FITNESS_READONLY,
  ACTIVITY_AND_FITNESS_WRITEONLY,
  ECG_READONLY,
  HEALTH_METRICS_AND_MEASUREMENTS_READONLY,
  HEALTH_METRICS_AND_MEASUREMENTS_WRITEONLY,
  IRN_READONLY,
  LOCATION_READONLY,
  LOGGED_SYMPTOMS_WRITEONLY,
  MINDFULNESS_WRITEONLY,
  NUTRITION_READONLY,
  NUTRITION_WRITEONLY,
  PROFILE_READONLY,
  PROFILE_WRITEONLY,
  REPRODUCTIVE_HEALTH_WRITEONLY,
  SETTINGS_READONLY,
  SETTINGS_WRITEONLY,
  SLEEP_READONLY,
  SLEEP_WRITEONLY,
} from "./google-health-scopes";

export const SCOPE_NAME_MAPPING: Record<string, string> = {
  [ACTIVITY_AND_FITNESS_READONLY]: "activity and fitness (read)",
  [ACTIVITY_AND_FITNESS_WRITEONLY]: "activity and fitness (write)",
  [ECG_READONLY]: "ECG (read)",
  [HEALTH_METRICS_AND_MEASUREMENTS_READONLY]:
    "health metrics and measurements (read)",
  [HEALTH_METRICS_AND_MEASUREMENTS_WRITEONLY]:
    "health metrics and measurements (write)",
  [IRN_READONLY]: "irregular rhythm notifications (read)",
  [LOCATION_READONLY]: "location (read)",
  [LOGGED_SYMPTOMS_WRITEONLY]: "logged symptoms (write)",
  [MINDFULNESS_WRITEONLY]: "mindfulness (write)",
  [NUTRITION_READONLY]: "nutrition (read)",
  [NUTRITION_WRITEONLY]: "nutrition (write)",
  [PROFILE_READONLY]: "profile (read)",
  [PROFILE_WRITEONLY]: "profile (write)",
  [REPRODUCTIVE_HEALTH_WRITEONLY]: "reproductive health (write)",
  [SETTINGS_READONLY]: "settings (read)",
  [SETTINGS_WRITEONLY]: "settings (write)",
  [SLEEP_READONLY]: "sleep (read)",
  [SLEEP_WRITEONLY]: "sleep (write)",
};

export function getScopeName(scope: string) {
  return SCOPE_NAME_MAPPING[scope] ?? scope;
}

export function getScopeNameList(scopes: string[]) {
  return scopes.map((scope) => getScopeName(scope)).join(", ");
}
