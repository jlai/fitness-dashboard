"use client";

import { Alert, Stack } from "@mui/material";
import { useAtomValue } from "jotai";
import { useState } from "react";

import { allowAPIProxyAtom } from "@/storage/settings";
import { FITBIT_API_PROXY_URL } from "@/config";
import { isLoggedIn } from "@/api/auth";

export function ProxyNotice() {
  const allowAPIProxy = useAtomValue(allowAPIProxyAtom);
  const [showing, setShowing] = useState(
    FITBIT_API_PROXY_URL && isLoggedIn() && !allowAPIProxy
  );

  if (!showing) {
    return undefined;
  }

  return (
    <Stack direction="row" justifyContent="center">
      <Alert
        severity="info"
        sx={{
          width: "max-content",
          maxWidth: "80%",
          marginInline: "16px",
          marginBottom: "16px",
        }}
        onClose={() => setShowing(false)}
      >
        There&apos;s currently a bug in the Fitbit API affecting the dashboard.
        We&apos;re waiting on Fitbit to fix the issue. In the meantime, check
        the{" "}
        <a href="/settings" className="underline">
          Settings page
        </a>{" "}
        for a workaround.
      </Alert>
    </Stack>
  );
}
