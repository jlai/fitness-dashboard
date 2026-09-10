"use client";

import { GoogleLogin } from "@react-oauth/google";
import { toast } from "mui-sonner";

import { createSession } from "@/api/auth";

export function GoogleSignInButton() {
  return (
    <GoogleLogin
      text="signin_with"
      onSuccess={(credentialResponse) => {
        if (!credentialResponse.credential) {
          return;
        }

        void createSession(credentialResponse.credential).catch(() => {
          toast.error("Unable to reach Google to sign in");
        });
      }}
      onError={() => {
        toast.error("Unable to reach Google to sign in");
      }}
    />
  );
}
