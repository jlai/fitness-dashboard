"use client";

import { useEffect } from "react";

import { loadGoogleAccountsId } from "@/api/google-identity";

import { useGoogleIdentity } from "./google-identity-provider";

/** Prompt Google One Tap. Does not call `initialize()` — the provider does. */
export function GoogleOneTap({ disabled = false }: { disabled?: boolean }) {
  const { ready } = useGoogleIdentity();

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    void loadGoogleAccountsId().then((id) => {
      if (cancelled) {
        return;
      }

      if (disabled) {
        id.cancel();
        return;
      }

      id.prompt();
    });

    return () => {
      cancelled = true;
      void loadGoogleAccountsId().then((id) => {
        id.cancel();
      });
    };
  }, [disabled, ready]);

  return null;
}
