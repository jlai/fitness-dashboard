"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { ensureGsiScript, initializeGoogleId } from "@/api/google-identity";

const GoogleIdentityContext = createContext<{ ready: boolean } | null>(null);

export function useGoogleIdentity() {
  const context = useContext(GoogleIdentityContext);

  if (!context) {
    throw new Error(
      "Google Identity components must be used within GoogleIdentityProvider",
    );
  }

  return context;
}

/**
 * Loads the GSI script (with a CSP nonce) and initializes Sign In With Google
 * once for the whole app.
 */
export function GoogleIdentityProvider({
  clientId,
  nonce,
  children,
}: {
  clientId: string;
  nonce?: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    ensureGsiScript(nonce);
  }, [nonce]);

  useEffect(() => {
    let cancelled = false;

    void initializeGoogleId({
      client_id: clientId,
      auto_select: true,
      use_fedcm_for_prompt: true,
    })
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.error("error loading Google Identity Services", error);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const value = useMemo(() => ({ ready }), [ready]);

  return (
    <GoogleIdentityContext.Provider value={value}>
      {children}
    </GoogleIdentityContext.Provider>
  );
}
