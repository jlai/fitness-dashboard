import { createContext, Suspense, useContext } from "react";
import { Paper } from "@mui/material";
import { useAtomValue, useSetAtom } from "jotai";

import { updateTileSettingsAtom } from "@/storage/tiles";

import { editingGridAtom } from "../state";

export interface TileContextData {
  w?: number;
  h?: number;
  id: string;
  type: string;
  settings?: unknown;
}

export const TileContext = createContext<TileContextData>({
  id: "unknown",
  type: "unknown",
});

export default function Tile({ children }: { children: React.ReactNode }) {
  const { id } = useTileData();

  return (
    <Paper
      data-testid={`tile-${id}`}
      className="size-full max-h-full select-none"
      elevation={2}
      tabIndex={0}
    >
      <Suspense>{children}</Suspense>
    </Paper>
  );
}

export function useTileData() {
  return useContext(TileContext);
}

export function useTileScale() {
  const { w = 1, h = 1 } = useTileData();
  return { scale: Math.min(w, h), w, h };
}

export function useTileSettings<TSettings>(
  defaultSettings: TSettings
): [TSettings, (update: TSettings) => void] {
  const { id, settings } = useTileData();
  const updateTileSettings = useSetAtom(updateTileSettingsAtom);

  return [
    { ...defaultSettings, ...(settings as TSettings) },
    (updatedSettings: TSettings) => updateTileSettings(id, updatedSettings),
  ];
}

/** Use a single tile settings property */
export function useTileSetting<TSettings, TProp extends keyof TSettings>(
  prop: TProp,
  defaultValue: TSettings[TProp]
): [TSettings[TProp], (update: TSettings[TProp]) => void] {
  const { id, settings } = useTileData() as {
    id: string;
    settings?: TSettings;
  };
  const updateTileSettings = useSetAtom(updateTileSettingsAtom);

  return [
    (settings && settings[prop]) ?? defaultValue,
    (update: TSettings[TProp]) =>
      updateTileSettings(id, { ...settings, [prop]: update }),
  ];
}

/** Clickable area which disables click events when editing grid */
export function TileClickableArea({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const isEditingGrid = useAtomValue(editingGridAtom);

  return (
    <button
      onClick={onClick}
      className={`block size-full ${
        isEditingGrid ? "pointer-events-none" : ""
      }`}
    >
      {children}
    </button>
  );
}
