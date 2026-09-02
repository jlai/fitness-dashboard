"use client";

import { Button, Container, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "material-ui-confirm";

import { useGoogleLoginAndAuthorization } from "@/api/auth";

export default function AccountNotLinkedPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { loginToGoogleAndAuthorize, ready } = useGoogleLoginAndAuthorization({
    selectAccount: true,
    includeGrantedScopes: false,
  });

  const switchAccounts = () => {
    confirm({
      description: "Log out?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        queryClient.clear();
        loginToGoogleAndAuthorize();
      }
    });
  };

  return (
    <Container maxWidth="md" className="space-y-8">
      <section className="space-y-4">
        <Typography variant="h4">Account has no Google Health data</Typography>
        <Typography variant="body1">
          Your Google Account is not linked to Google Health. If you&apos; an
          Google Health user, check that you&apos;re signed into the
          correct account. Or{" "}
          <a
            href="https://www.google.com/health"
            target="_blank"
            className="underline"
          >
            learn more about Google Health
          </a>
          .
        </Typography>
      </section>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="contained" onClick={switchAccounts} disabled={!ready}>
          Sign in with a different account
        </Button>
      </div>
    </Container>
  );
}
