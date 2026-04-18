export const SCOPE_NAME_MAPPING: Record<string, string> = {
  pro: "profile",
  nut: "nutrition",
  act: "activity",
  sle: "sleep",
  hr: "heart rate",
  soc: "social",
  wei: "weight",
  set: "device settings",
  loc: "location",
  res: "breathing rate",
  oxy: "oxygen saturation (SpO2)",
  tem: "temperature",
};

export function getScopeName(scope: string) {
  return (
    SCOPE_NAME_MAPPING[scope] ??
    (scope.startsWith("w")
      ? SCOPE_NAME_MAPPING[scope.substring(1)]
      : undefined) ??
    scope
  );
}

export function getScopeNameList(scopes: string[]) {
  return scopes.map((scope) => getScopeName(scope)).join(", ");
}
