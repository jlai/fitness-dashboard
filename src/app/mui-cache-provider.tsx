"use client";

import React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

export function MuiCacheProvider({
  nonce,
  children,
}: {
  nonce?: string;
  children: React.ReactNode;
}) {
  // Keep the document nonce from the first paint. Client navigations can
  // receive a new x-nonce on RSC requests, but the document CSP does not change.
  const documentNonce = React.useRef(nonce).current;

  return (
    <AppRouterCacheProvider
      options={{ key: "css", nonce: documentNonce, prepend: true }}
    >
      {children}
    </AppRouterCacheProvider>
  );
}
