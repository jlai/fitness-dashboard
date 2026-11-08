/** SettingsStorage keys for persisted app data blobs. */
export const SETTINGS_STORAGE_KEYS = {
  dashboards: "dashboards",
  clientOnlyGoals: "client-only-goals",
  meals: "meals",
  clientOnlyFoods: "client-only-foods",
  clientOnlyFavoriteFoods: "client-only-favorite-foods",
  settings: "settings",
} as const;

export type SettingsStorageKey =
  (typeof SETTINGS_STORAGE_KEYS)[keyof typeof SETTINGS_STORAGE_KEYS];
