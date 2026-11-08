"use client";

import { useLayoutEffect } from "react";
import { toast } from "mui-sonner";

import { GoogleOneTap } from "@/components/login/google-identity";

import { logError } from "@/utils/log-error";

import { createSession, useOpenIdSignedIn } from "./auth";
import { setGoogleIdTokenCallback } from "./google-identity";

/** Initialize Google One Tap once on page load. */
export function GoogleOpenIdAutomaticSignIn() {
  const alreadySignedIn = useOpenIdSignedIn();

  useLayoutEffect(() => {
    setGoogleIdTokenCallback((response) => {
      if (!response.credential) {
        toast.error("Unable to reach Google to sign in");
        return;
      }

      void createSession(response.credential).catch((error) => {
        logError("error creating session", error);
        toast.error("Unable to reach Google to sign in");
      });
    });
  }, []);

  return <GoogleOneTap disabled={alreadySignedIn} />;
}
