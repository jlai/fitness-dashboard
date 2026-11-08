"use client";

import { Button, Container, Typography } from "@mui/material";

import { useSwitchAccounts } from "@/components/login/use-switch-accounts";

export default function AccountNotLinkedPage() {
  const switchAccounts = useSwitchAccounts();

  return (
    <Container maxWidth="md" className="space-y-8">
      <section className="space-y-4">
        <Typography variant="h4">Account has no Google Health data</Typography>
        <Typography variant="body1">
          Your Google Account is not linked to Google Health. If you&apos; an
          Google Health user, check that you&apos;re signed into the correct
          account. Or{" "}
          <a
            href="https://www.google.com/health"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            learn more about Google Health
          </a>
          .
        </Typography>
        <Typography variant="body1">
          If you need to create a Google Health account for app testing/approval
          purposes you can sign up online without the Google Health app via{" "}
          <a
            href="https://fitbit.google.com/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            this link
          </a>
          .
        </Typography>
      </section>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button variant="contained" onClick={switchAccounts}>
          Sign in with a different account
        </Button>
      </div>
    </Container>
  );
}
