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
  return (
    <Paper
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

export function useTileSettings<TSettings>(
  defaultSettings: TSettings
): [TSettings, (update: TSettings) => void] {
  const { id, settings } = useTileData();
  const updateTileSettings = useSetAtom(updateTileSettingsAtom);

  return [
    (settings ?? defaultSettings) as TSettings,
    (updatedSettings: TSettings) => updateTileSettings(id, updatedSettings),
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
