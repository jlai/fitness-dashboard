import { createContext, Suspense, useContext } from "react";
import { Paper } from "@mui/material";
import { useAtomValue } from "jotai";

import { editingGridAtom } from "../state";

export interface TileContextData {
  w?: number;
  h?: number;
  type: string;
}

export const TileContext = createContext<TileContextData>({
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
      className={`size-full ${isEditingGrid ? "pointer-events-none" : ""}`}
    >
      {children}
    </button>
  );
}
