"use client";

import { useGoogleOneTapLogin } from "@react-oauth/google";

import { createSession, useOpenIdSignedIn } from "./auth";

/** Initialize Google One Tap once on page load. */
export function GoogleOpenIdAutomaticSignIn() {
  const alreadySignedIn = useOpenIdSignedIn();

  useGoogleOneTapLogin({
    auto_select: true,
    use_fedcm_for_prompt: true,
    disabled: alreadySignedIn,
    onSuccess: (credentialResponse) => {
      if (credentialResponse.credential) {
        void createSession(credentialResponse.credential).catch((error) => {
          console.error("error creating session", error);
        });
      }
    },
  });

  return null;
}
