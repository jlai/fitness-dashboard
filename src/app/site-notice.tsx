"use client";

import { Alert, Stack } from "@mui/material";
import DOMPurify from "dompurify";
import { useState } from "react";

import { SITE_NOTICE_HTML } from "@/config";

export function SiteNotice() {
  const [showing, setShowing] = useState(true);

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
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify().sanitize(SITE_NOTICE_HTML ?? "", {
              RETURN_TRUSTED_TYPE: true,
            }),
          }}
        ></div>
      </Alert>
    </Stack>
  );
}
