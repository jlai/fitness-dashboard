import { Suspense } from "react";
import { Paper } from "@mui/material";

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
