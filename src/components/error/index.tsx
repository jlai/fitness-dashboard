"use client";

import { Alert, Button, Stack } from "@mui/material";
import {
  QueryErrorResetBoundary,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { ComponentType } from "react";
import {
  useErrorBoundary,
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from "react-error-boundary";

export function ErrorBoundary({
  children,
  FallbackComponent,
}: {
  children: React.ReactNode;
  FallbackComponent?: ComponentType<FallbackProps>;
}) {
  const logError = (error: Error, info: { componentStack?: string | null }) => {
    console.error("Error caught in ErrorBoundary:\n", error);
  };

  return (
    <QueryErrorResetBoundary>
      <ReactErrorBoundary
        onError={logError}
        FallbackComponent={FallbackComponent ?? ErrorFallback}
      >
        {children}
      </ReactErrorBoundary>
    </QueryErrorResetBoundary>
  );
}

export function ErrorFallback({ error }: { error: any }) {
  const { resetBoundary } = useErrorBoundary();
  const { reset: resetQueries } = useQueryErrorResetBoundary();

  const retry = () => {
    resetQueries();
    resetBoundary();
  };

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      className="size-full"
    >
      <Alert
        severity="error"
        action={
          <Button onClick={retry} size="small">
            Retry
          </Button>
        }
      >
        Error loading: {error && error.message}
      </Alert>
    </Stack>
  );
}

export function TileErrorFallback({ error }: { error: any }) {
  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      className="size-full text-center"
    >
      Error loading: {error && error.message}
    </Stack>
  );
}
