"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ListItemText, MenuItem, Select, Stack } from "@mui/material";
import { useAtomValue } from "jotai";
import { toast } from "mui-sonner";
import { z } from "zod";

import {
  SETTINGS_STORAGE_KEYS,
  settingsStorageAtom,
  settingsStorageEpochAtom,
  type SettingsStorageKey,
  type StoredData,
} from "@/storage/settings-storage";
import { logError } from "@/utils/log-error";

import { SettingsRow } from "../common";

const EXPORT_LABELS = {
  [SETTINGS_STORAGE_KEYS.dashboards]: "Dashboard tiles",
  [SETTINGS_STORAGE_KEYS.clientOnlyGoals]: "Goals (dashboard only)",
  [SETTINGS_STORAGE_KEYS.meals]: "Meals",
  [SETTINGS_STORAGE_KEYS.clientOnlyFoods]: "Food templates",
  [SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods]: "Favorite foods",
  [SETTINGS_STORAGE_KEYS.settings]: "Settings",
} satisfies Record<SettingsStorageKey, string>;

const countSchemas = {
  [SETTINGS_STORAGE_KEYS.dashboards]: z.object({
    dashboards: z.array(z.object({ tiles: z.array(z.unknown()) })),
  }),
  [SETTINGS_STORAGE_KEYS.clientOnlyGoals]: z.object({
    clientOnlyGoals: z.array(z.unknown()),
  }),
  [SETTINGS_STORAGE_KEYS.meals]: z.object({ meals: z.array(z.unknown()) }),
  [SETTINGS_STORAGE_KEYS.clientOnlyFoods]: z.object({
    clientOnlyFoods: z.array(z.unknown()),
  }),
  [SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods]: z.object({
    clientOnlyFavoriteFoods: z.array(z.unknown()),
  }),
  [SETTINGS_STORAGE_KEYS.settings]: z.object({
    settings: z.record(z.string(), z.unknown()),
  }),
};

function itemCount(
  key: SettingsStorageKey,
  stored: StoredData<unknown> | null,
) {
  if (!stored) return 0;
  switch (key) {
    case SETTINGS_STORAGE_KEYS.dashboards: {
      const result = countSchemas.dashboards.safeParse(stored.data);
      return result.success
        ? result.data.dashboards.reduce(
            (total, dashboard) => total + dashboard.tiles.length,
            0,
          )
        : null;
    }
    case SETTINGS_STORAGE_KEYS.clientOnlyGoals: {
      const result = countSchemas[key].safeParse(stored.data);
      return result.success ? result.data.clientOnlyGoals.length : null;
    }
    case SETTINGS_STORAGE_KEYS.meals: {
      const result = countSchemas[key].safeParse(stored.data);
      return result.success ? result.data.meals.length : null;
    }
    case SETTINGS_STORAGE_KEYS.clientOnlyFoods: {
      const result = countSchemas[key].safeParse(stored.data);
      return result.success ? result.data.clientOnlyFoods.length : null;
    }
    case SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods: {
      const result = countSchemas[key].safeParse(stored.data);
      return result.success ? result.data.clientOnlyFavoriteFoods.length : null;
    }
    case SETTINGS_STORAGE_KEYS.settings: {
      const result = countSchemas.settings.safeParse(stored.data);
      return result.success ? Object.keys(result.data.settings).length : null;
    }
  }
}

type CountState = { count: number | null } | { error: true };

export function TroubleshootingSettings() {
  const storage = useAtomValue(settingsStorageAtom);
  const epoch = useAtomValue(settingsStorageEpochAtom);
  const [key, setKey] = useState<SettingsStorageKey | "">("");
  const [counts, setCounts] = useState<
    Partial<Record<SettingsStorageKey, CountState>>
  >({});
  const [downloading, setDownloading] = useState(false);
  const requestId = useRef(0);

  const refreshCounts = useCallback(async () => {
    const request = ++requestId.current;
    const entries = await Promise.all(
      Object.values(SETTINGS_STORAGE_KEYS).map(async (itemKey) => {
        try {
          const stored = await storage.get(itemKey);
          return [itemKey, { count: itemCount(itemKey, stored) }] as const;
        } catch (error) {
          logError(
            `Failed to load troubleshooting data for "${itemKey}"`,
            error,
          );
          return [itemKey, { error: true }] as const;
        }
      }),
    );
    if (request !== requestId.current) return;
    setCounts(Object.fromEntries(entries));
    if (entries.some(([, state]) => "error" in state)) {
      toast.error(
        "Failed to load some troubleshooting data. Open the list to retry.",
      );
    }
  }, [storage]);

  useEffect(() => {
    const counter = requestId;
    setCounts({});
    void refreshCounts();
    return () => {
      counter.current++;
    };
  }, [refreshCounts, epoch]);

  const selectedState = key ? counts[key] : undefined;
  const canDownload =
    !!key &&
    !!selectedState &&
    "count" in selectedState &&
    selectedState.count !== 0;

  const download = async () => {
    if (!key || !canDownload) return;
    setDownloading(true);
    try {
      const stored = await storage.get(key);
      if (itemCount(key, stored) === 0) {
        toast.error("There is no stored data to export for this selection.");
        void refreshCounts();
        return;
      }
      const blob = new Blob([JSON.stringify(stored, null, 2)], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${key}.json.txt`;
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (error) {
      logError("Failed to export troubleshooting data", error);
      toast.error("Failed to export troubleshooting data.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <SettingsRow title="Troubleshooting">
        This section contains tools used for bug reports and troubleshooting.
        The data exported might contain sensitive information and should be
        reviewed (in a text editor) before uploading to a public website like
        Github.
      </SettingsRow>
      <SettingsRow title="Debug export" component="div">
        Download the selected stored data as a text file containing JSON.
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 2 }}
        >
          <Select<SettingsStorageKey | "">
            SelectDisplayProps={{ "aria-label": "Debug export" }}
            value={canDownload ? key : ""}
            displayEmpty
            renderValue={(value) =>
              value ? EXPORT_LABELS[value] : "Select data to export"
            }
            onOpen={() => void refreshCounts()}
            onChange={(event) => {
              const selected = Object.values(SETTINGS_STORAGE_KEYS).find(
                (value) => value === event.target.value,
              );
              if (selected) setKey(selected);
            }}
          >
            {Object.values(SETTINGS_STORAGE_KEYS).map((value) => {
              const state = counts[value];
              const subtitle = !state
                ? "Loading..."
                : "error" in state
                  ? "Unable to load"
                  : state.count === null
                    ? "Item count unavailable"
                    : state.count === 0
                      ? "No items"
                      : `${state.count} ${state.count === 1 ? "item" : "items"}`;
              return (
                <MenuItem
                  key={value}
                  value={value}
                  disabled={!state || "error" in state || state.count === 0}
                >
                  <ListItemText
                    primary={EXPORT_LABELS[value]}
                    secondary={subtitle}
                  />
                </MenuItem>
              );
            })}
          </Select>
          <Button onClick={download} disabled={downloading || !canDownload}>
            Download
          </Button>
        </Stack>
      </SettingsRow>
    </>
  );
}
