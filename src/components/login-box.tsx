"use client";

import { Button, Container, Typography } from "@mui/material";
import { useCallback } from "react";

import { redirectToLogin } from "@/api/auth";

export default function LoginBox() {
  const login = useCallback(() => {
    redirectToLogin();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h3" marginBottom="24px">
        Connect your Fitbit account
      </Typography>
      <div className="space-y-4">
        <Typography variant="body1">
          Connect your Fitbit account to display your daily stats on this
          website.
        </Typography>
        <Typography variant="body1">
          No health or personal information will be shared with the operators of
          this website or any third party. Data retrieved from the Fitbit Web
          API will be stored solely in your browser&apos;s memory and offline
          storage/cache.
        </Typography>
      </div>
      <div className="mt-8 flex flex-col items-center">
        <Button variant="contained" onClick={login}>
          Connect with Fitbit
        </Button>
      </div>
    </Container>
  );
}
