export const SCOPE_NAME_MAPPING: Record<string, string> = {
  act: "activity and fitness",
  cf: "cardio fitness (VO2 Max)",
  hr: "heart rate",
  loc: "location",
  nut: "nutrition",
  oxy: "oxygen saturation (SpO2)",
  pro: "profile",
  res: "breathing rate",
  set: "device settings",
  sle: "sleep",
  tem: "temperature",
  wei: "weight",
};

export function getScopeName(scope: string) {
  return SCOPE_NAME_MAPPING[scope] ?? scope;
}

export function getScopeNameList(scopes: string[]) {
  return scopes.map((scope) => getScopeName(scope)).join(", ");
}
