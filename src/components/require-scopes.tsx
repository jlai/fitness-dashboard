"use client";

import { Typography, Button } from "@mui/material";
import { useCallback } from "react";

import { getAccessTokenScopes, redirectToLogin } from "@/api/auth";

const SCOPE_NAME_MAPPING: Record<string, string> = {
  pro: "profile",
  nut: "nutrition",
  act: "activity",
  sle: "sleep",
  hr: "heart rate",
  soc: "social",
  tem: "temperature",
  wei: "weight",
  set: "device settings",
};

function getScopeName(scope: string) {
  return SCOPE_NAME_MAPPING[scope] ?? SCOPE_NAME_MAPPING[`w${scope}`] ?? scope;
}

export function RequireScopes({
  scopes: requiredScopes,
  children,
}: {
  scopes?: Array<string>;
  children: React.ReactNode;
}) {
  if (requiredScopes) {
    const scopes = getAccessTokenScopes();
    const missingScopes = requiredScopes.filter(
      (scope) => !scopes.has(scope) && !scopes.has(`w${scope}`)
    );

    if (missingScopes.length > 0) {
      return <MissingScopes scopes={missingScopes} />;
    }
  }

  return children;
}

function MissingScopes({ scopes }: { scopes: Array<string> }) {
  const reconsent = useCallback(() => {
    redirectToLogin({ prompt: "consent" });
  }, []);

  return (
    <div className="flex-grow flex flex-col items-center place-items-center">
      <Typography variant="body1" className="mb-2">
        This page requires additional permissions from your Fitbit account:{" "}
        {scopes.map((scope) => getScopeName(scope)).join(", ")}
      </Typography>
      <Button onClick={reconsent}>Update permissions</Button>
    </div>
  );
}
