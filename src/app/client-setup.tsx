"use client";

import React, { useMemo } from "react";
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

import { GoogleOAuthProvider } from "@react-oauth/google";

import { syncAuthTokenEffect } from "@/api/auth";
import {
  redirectOnAccountNotLinkedEffect,
  warnOnRateLimitExceededEffect,
} from "@/api/request";
import { GOOGLE_OAUTH_CLIENT_ID } from "@/config";
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
  useAtom(syncAuthTokenEffect);
  useAtom(analyticsPingEffect);
  useAtom(warnOnRateLimitExceededEffect);
  useAtom(redirectOnAccountNotLinkedEffect);
  useAtom(numberFormatAtomEffect);
  useAtom(dateFormatAtomEffect);

  return (
    <React.Fragment key={`key-{pageRefreshKey}`}>{children}</React.Fragment>
  );
}

export default function ClientSideSetup({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () => buildTheme(prefersDarkMode ? "dark" : "light"),
    [prefersDarkMode],
  );
  // Keep the document nonce from the first paint. Client navigations can
  // receive a new x-nonce on RSC requests, but the document CSP does not change.
  const documentNonce = React.useRef(nonce).current;

  return (
    <GoogleOAuthProvider
      clientId={GOOGLE_OAUTH_CLIENT_ID}
      nonce={documentNonce}
    >
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
    </GoogleOAuthProvider>
  );
}
