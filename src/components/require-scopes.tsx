"use client";

import { Typography, Button, Stack } from "@mui/material";
import { useCallback } from "react";
import { useConfirm } from "material-ui-confirm";
import { useAtomValue } from "jotai";

import { getAccessTokenScopes, redirectToLogin } from "@/api/auth";
import { enableAdvancedScopesAtom } from "@/storage/settings";
import { getScopeName, getScopeNameList } from "@/config/scopes";

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
  const enableAdvancedScopes = useAtomValue(enableAdvancedScopesAtom);

  const handleReconsentClicked = () => {
    confirm({
      title: "Update permissions",
      description: (
        <div>
          The following permissions are needed:{" "}
          <b>{getScopeNameList(scopes)}</b>. Click OK to be redirected to Fitbit
          to update the types of data accessible by this website.
        </div>
      ),
    }).then(({ confirmed }) => {
      if (confirmed) {
        redirectToLogin({
          prompt: "consent",
          requestAdvancedScopes: enableAdvancedScopes,
        });
      }
    });
  };

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
      <Button onClick={handleReconsentClicked}>Fix permissions</Button>
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
  const enableAdvancedScopes = useAtomValue(enableAdvancedScopesAtom);

  const reconsent = useCallback(() => {
    redirectToLogin({
      prompt: "consent",
      requestAdvancedScopes: enableAdvancedScopes,
    });
  }, [enableAdvancedScopes]);

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
