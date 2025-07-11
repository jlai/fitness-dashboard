"use client";

import { useMemo } from "react";
import {
  StyledEngineProvider,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ConfirmProvider } from "material-ui-confirm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHydrateAtoms } from "jotai/utils";
import { Toaster } from "mui-sonner";
import { useAtom, Provider as JotaiProvider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { syncFitbitTokenEffect } from "@/api/auth";
import { warnOnRateLimitExceededEffect } from "@/api/request";
import { analyticsPingEffect } from "@/storage/analytics";
import {
  dateFormatAtomEffect,
  numberFormatAtomEffect,
} from "@/storage/settings";

import { buildTheme } from "./theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

function Setup({ children }: { children: React.ReactNode }) {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  useAtom(syncFitbitTokenEffect);
  useAtom(warnOnRateLimitExceededEffect);

  return children;
}

export default function ClientSideSetup({
  children,
}: {
  children: React.ReactNode;
}) {
  useAtom(syncFitbitTokenEffect);
  useAtom(analyticsPingEffect);
  useAtom(numberFormatAtomEffect);
  useAtom(dateFormatAtomEffect);

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () => buildTheme(prefersDarkMode ? "dark" : "light"),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <JotaiProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <StyledEngineProvider injectFirst>
            <QueryClientProvider client={queryClient}>
              <ConfirmProvider>
                <Setup>{children}</Setup>
                <Toaster />
              </ConfirmProvider>
            </QueryClientProvider>
          </StyledEngineProvider>
        </LocalizationProvider>
      </JotaiProvider>
    </ThemeProvider>
  );
}
