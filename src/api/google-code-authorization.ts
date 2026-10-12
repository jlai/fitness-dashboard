"use client";

import { useCallback, useRef } from "react";
import { toast } from "mui-sonner";

import { GOOGLE_OAUTH_CLIENT_ID } from "@/config";
import { logError } from "@/utils/log-error";

import { getSessionSubject } from "./auth";
import { loadGoogleOAuth2, useGoogleIdentityReady } from "./google-identity";

/**
 * Open a GIS CodeClient popup and exchange the resulting authorization code.
 */
export function useGoogleCodeAuthorization({
  scopes,
  selectAccount = false,
  failureLog,
  failureToast,
  exchangeCode,
}: {
  scopes: readonly string[];
  selectAccount?: boolean;
  failureLog: string;
  failureToast: string;
  exchangeCode: (code: string) => Promise<unknown>;
}) {
  const scriptLoadedSuccessfully = useGoogleIdentityReady();
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);

  const failPending = useCallback(
    (error: unknown, { silent = false }: { silent?: boolean } = {}) => {
      const pending = pendingRef.current;
      pendingRef.current = null;

      if (!silent) {
        logError(failureLog, error);
        toast.error(failureToast);
      }

      pending?.reject(
        error instanceof Error
          ? error
          : new Error(
              typeof error === "object" &&
                error &&
                "type" in error &&
                typeof error.type === "string"
                ? error.type
                : String(error),
            ),
      );
    },
    [failureLog, failureToast],
  );

  const completeAuthorization = useCallback(
    async (code: string) => {
      const pending = pendingRef.current;

      try {
        await exchangeCode(code);
        pendingRef.current = null;
        pending?.resolve();
      } catch (error) {
        failPending(error);
      }
    },
    [exchangeCode, failPending],
  );

  const requestAuthorization = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { resolve, reject };

      void (async () => {
        try {
          const oauth2 = await loadGoogleOAuth2();
          const hint = selectAccount ? undefined : getSessionSubject();
          const client = oauth2.initCodeClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: scopes.join(" "),
            ux_mode: "popup",
            hint,
            include_granted_scopes: false,
            select_account: selectAccount,
            callback: (codeResponse) => {
              if (codeResponse.error) {
                failPending(
                  new Error(
                    codeResponse.error_description ||
                      codeResponse.error ||
                      "authorization failed",
                  ),
                  { silent: codeResponse.error === "access_denied" },
                );
                return;
              }

              void completeAuthorization(codeResponse.code);
            },
            error_callback: (error) => {
              failPending(error, { silent: error.type === "popup_closed" });
            },
          });

          client.requestCode();
        } catch (error) {
          failPending(error);
        }
      })();
    });
  }, [completeAuthorization, failPending, scopes, selectAccount]);

  return { requestAuthorization, ready: scriptLoadedSuccessfully };
}
