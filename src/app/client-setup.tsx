"use client";

import { useEffect, useState } from "react";
import { StyledEngineProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ConfirmProvider } from "material-ui-confirm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHydrateAtoms } from "jotai/utils";
import { Toaster } from "mui-sonner";
import {
  useSetAtom,
  useAtomValue,
  useAtom,
  Provider as JotaiProvider,
} from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { startPollyAtom, stopPollyAtom } from "@/storage/polly";
import { pollyEnabledAtom } from "@/storage/settings";
import { syncFitbitTokenEffect } from "@/api/auth";
import { warnOnRateLimitExceededEffect } from "@/api/request";

function PollyWrapper({ children }: { children: React.ReactNode }) {
  const startPolly = useSetAtom(startPollyAtom);
  const stopPolly = useSetAtom(stopPollyAtom);

  const [pollyReady, setPollyReady] = useState(false);

  useEffect(() => {
    console.log("setting up polly");

    startPolly().then(() => {
      setPollyReady(true);
    });

    return () => {
      stopPolly();
    };
  }, [startPolly, stopPolly]);

  return pollyReady ? children : <></>;
}

function DevelopmentSetup({ children }: { children: React.ReactNode }) {
  const enablePolly = useAtomValue(pollyEnabledAtom);

  return enablePolly ? <PollyWrapper>{children}</PollyWrapper> : children;
}

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

  return (
    <JotaiProvider>
      <DevelopmentSetup>
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
      </DevelopmentSetup>
    </JotaiProvider>
  );
}
