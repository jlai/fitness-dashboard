"use client";

import { Alert, Typography, Button, Stack } from "@mui/material";
import { useConfirm } from "material-ui-confirm";

import { useGoogleLoginAndAuthorization, useMissingScopes } from "@/api/auth";
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
  const missingScopes = useMissingScopes(requiredScopes);

  if (requiredScopes && missingScopes.length > 0) {
    return compact ? (
      <CompactMissingScopes name={name} scopes={missingScopes} />
    ) : (
      <MissingScopes name={name} scopes={missingScopes} />
    );
  }

  return children;
}

export function MissingScopesAlert({
  scopes: requiredScopes,
  children,
}: {
  scopes: Array<string>;
  children?: React.ReactNode;
}) {
  const missingScopes = useMissingScopes(requiredScopes);
  const { googleLoginAndAuthorization } = useGoogleLoginAndAuthorization();
  const disabled = missingScopes.length > 0;

  return (
    <>
      {disabled && (
        <Alert
          severity="warning"
          className="mb-4"
          action={
            <Button
              type="button"
              size="small"
              onClick={() => googleLoginAndAuthorization()}
            >
              Update permissions
            </Button>
          }
        >
          Saving requires additional permissions from your Google account:{" "}
          {getScopeNameList(missingScopes)}
        </Alert>
      )}
      {children != null && (
        <fieldset
          disabled={disabled}
          className="m-0 min-w-0 w-full border-0 p-0"
        >
          {children}
        </fieldset>
      )}
    </>
  );
}

function CompactMissingScopes({
  name,
  scopes,
}: {
  name?: string;
  scopes: Array<string>;
}) {
  const confirm = useConfirm();
  const { googleLoginAndAuthorization } = useGoogleLoginAndAuthorization();

  const handleReconsentClicked = () => {
    confirm({
      title: "Update permissions",
      description: (
        <div>
          The following permissions are needed:{" "}
          <b>{getScopeNameList(scopes)}</b>. Click OK to be redirected to Google
          to update the types of data accessible by this website.
        </div>
      ),
    }).then(({ confirmed }) => {
      if (confirmed) {
        googleLoginAndAuthorization();
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
  const { googleLoginAndAuthorization } = useGoogleLoginAndAuthorization();

  return (
    <div className="flex-grow flex flex-col items-center place-items-center p-2">
      <Typography variant="body1" className="mb-2">
        {name ?? "This page"} requires additional permissions from your Google
        account: {scopes.map((scope) => getScopeName(scope)).join(", ")}
      </Typography>
      <Button onClick={() => googleLoginAndAuthorization()}>
        Update permissions
      </Button>
    </div>
  );
}
