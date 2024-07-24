"use client";

import { createTheme } from "@mui/material/styles";
import { Open_Sans } from "next/font/google";

export const mainFont = Open_Sans({
  weight: ["400", "500"],
  subsets: ["latin"],
});

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
