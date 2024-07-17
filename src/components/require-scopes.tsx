"use client";

import { Typography, Button, Stack } from "@mui/material";
import { useCallback } from "react";
import { useConfirm } from "material-ui-confirm";

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
  compact,
  name,
}: {
  scopes?: Array<string>;
  children: React.ReactNode;
  compact?: boolean;
  name?: string;
}) {
  if (requiredScopes) {
    const scopes = getAccessTokenScopes();
    const missingScopes = requiredScopes.filter(
      (scope) => !scopes.has(scope) && !scopes.has(`w${scope}`)
    );

    if (missingScopes.length > 0) {
      return compact ? (
        <CompactMissingScopes name={name} scopes={missingScopes} />
      ) : (
        <MissingScopes name={name} scopes={missingScopes} />
      );
    }
  }

  return children;
}

function CompactMissingScopes({
  name,
  scopes,
}: {
  name?: string;
  scopes: Array<string>;
}) {
  const confirm = useConfirm();

  const reconsent = useCallback(() => {
    confirm({
      title: "Update permissions",
      description: (
        <div>
          The following permissions are needed:{" "}
          <b>{scopes.map((scope) => getScopeName(scope)).join(", ")}</b>. Click
          OK to be redirected to Fitbit to update the types of data accessible
          by this website.
        </div>
      ),
    }).then(() => {
      redirectToLogin({ prompt: "consent" });
    });
  }, [confirm, scopes]);

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Typography variant="subtitle1" className="text-center">
        {name}
      </Typography>
      <Button onClick={reconsent}>Fix permissions</Button>
    </Stack>
  );
}

function MissingScopes({
  name,
  scopes,
}: {
  name?: string;
  scopes: Array<string>;
}) {
  const reconsent = useCallback(() => {
    redirectToLogin({ prompt: "consent" });
  }, []);

  return (
    <div className="flex-grow flex flex-col items-center place-items-center p-2">
      <Typography variant="body1" className="mb-2">
        {name ?? "This page"} requires additional permissions from your Fitbit
        account: {scopes.map((scope) => getScopeName(scope)).join(", ")}
      </Typography>
      <Button onClick={reconsent}>Update permissions</Button>
    </div>
  );
}
