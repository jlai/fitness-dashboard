"use client";

import { useEffect, useRef } from "react";

import { loadGoogleAccountsId } from "@/api/google-identity";

import { useGoogleIdentity } from "./google-identity-provider";

const BUTTON_HEIGHT = {
  large: 40,
  medium: 32,
  small: 20,
} as const;

/** Render the GIS Sign In With Google button. Does not call `initialize()`. */
export function GoogleLoginButton({
  type = "standard",
  theme = "outline",
  size = "large",
  text = "signin_with",
  shape,
  logo_alignment,
  width,
}: Partial<google.accounts.id.GsiButtonConfiguration> = {}) {
  const { ready } = useGoogleIdentity();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!ready || !container) {
      return;
    }

    container.innerHTML = "";

    void loadGoogleAccountsId().then((id) => {
      if (containerRef.current !== container) {
        return;
      }

      id.renderButton(container, {
        type,
        theme,
        size,
        text,
        ...(shape ? { shape } : {}),
        ...(logo_alignment ? { logo_alignment } : {}),
        ...(width != null ? { width } : {}),
      });
    });
  }, [logo_alignment, ready, shape, size, text, theme, type, width]);

  return (
    <div
      ref={containerRef}
      style={{ height: BUTTON_HEIGHT[size ?? "large"] }}
    />
  );
}
