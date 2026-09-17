"use client";

import { atom } from "jotai";
import { RESET } from "jotai/utils";

import {
  createDefaultDashboardsData,
  createSettingsBlobAtom,
  dashboardsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type DashboardsData,
  type Dashboard,
} from "@/storage/settings-storage";

export interface UserTile<TSettings = unknown> {
  id: string;
  type: string;
  x?: number;
  y?: number;
  w: number;
  h: number;
  settings?: TSettings;
}

export type { Dashboard, DashboardsData };

export const dashboardsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.dashboards,
  schema: dashboardsStoredSchema,
  defaultData: createDefaultDashboardsData,
});

function mainDashboard(data: DashboardsData): Dashboard | undefined {
  return (
    data.dashboards.find((dashboard) => dashboard.name === "Main") ??
    data.dashboards[0]
  );
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

/**
 * Façade over the Main (or first) dashboard's tiles.
 * Supports jotai RESET by restoring default dashboards.
 */
export const userTilesAtom = atom(
  (get) => {
    const dataOrPromise = get(dashboardsAtom);

    if (isPromiseLike(dataOrPromise)) {
      return dataOrPromise.then(
        (data) => mainDashboard(data)?.tiles ?? [],
      );
    }

    return mainDashboard(dataOrPromise)?.tiles ?? [];
  },
  async (
    get,
    set,
    update:
      | Array<UserTile>
      | ((prev: Array<UserTile>) => Array<UserTile>)
      | typeof RESET,
  ) => {
    if (update === RESET) {
      await set(dashboardsAtom, RESET);
      return;
    }

    const data = await get(dashboardsAtom);
    const dashboards = [...data.dashboards];
    let index = dashboards.findIndex((dashboard) => dashboard.name === "Main");
    if (index < 0) {
      index = 0;
    }

    if (!dashboards[index]) {
      const defaults = createDefaultDashboardsData();
      const tiles =
        typeof update === "function" ? update(defaults.dashboards[0]!.tiles) : update;
      await set(dashboardsAtom, {
        dashboards: [
          {
            ...defaults.dashboards[0]!,
            tiles,
          },
        ],
      });
      return;
    }

    const current = dashboards[index]!;
    const tiles =
      typeof update === "function" ? update(current.tiles) : update;
    dashboards[index] = { ...current, tiles };
    await set(dashboardsAtom, { dashboards });
  },
);

export const updateTileSettingsAtom = atom(
  null,
  async (get, set, id: string, settings: unknown) => {
    const tiles = await get(userTilesAtom);

    const updatedTiles = tiles.map((tile) => {
      if (tile.id === id) {
        return { ...tile, settings };
      }

      return tile;
    });

    await set(userTilesAtom, updatedTiles);
  },
);
