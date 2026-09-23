"use client";

import { createTheme } from "@mui/material/styles";

import { openSans } from "@/fonts";

export const mainFont = openSans;

export function buildTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
    },
    typography: {
      fontFamily: `${mainFont.style.fontFamily}, Helvetica, Arial, san-serif`,
    },
    components: {
      MuiStack: {
        defaultProps: {
          useFlexGap: true,
        },
      },
    },
  });
}
