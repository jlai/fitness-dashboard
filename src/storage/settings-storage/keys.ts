/** SettingsStorage keys for persisted app data blobs. */
export const SETTINGS_STORAGE_KEYS = {
  dashboards: "dashboards",
  goals: "goals",
  meals: "meals",
  customFoods: "custom-foods",
  settings: "settings",
} as const;

export type SettingsStorageKey =
  (typeof SETTINGS_STORAGE_KEYS)[keyof typeof SETTINGS_STORAGE_KEYS];
