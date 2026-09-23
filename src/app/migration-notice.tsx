"use client";

import { Alert, Stack } from "@mui/material";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function MigrationNotice() {
  const pathname = usePathname();
  const [showing, setShowing] = useState(true);

  if (
    !showing ||
    pathname === "/about/migration" ||
    pathname === "/settings/migration"
  ) {
    return undefined;
  }

  return (
    <Stack direction="row" justifyContent="center">
      <Alert
        severity="warning"
        sx={{
          width: "max-content",
          maxWidth: "80%",
          marginInline: "16px",
          marginBottom: "16px",
        }}
        onClose={() => setShowing(false)}
      >
        Prepare for the transition to Google Health before Sep 29th.{" "}
        <a href="/about/migration" className="underline">
          Learn more
        </a>
        .
      </Alert>
    </Stack>
  );
}
