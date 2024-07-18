import { createContext, Suspense } from "react";
import { Paper } from "@mui/material";

export interface TileContextData {
  w?: number;
  h?: number;
}

export const TileContext = createContext<TileContextData>({});

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
