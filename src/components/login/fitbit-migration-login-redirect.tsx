"use client";

import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";

import { pendingRememberMeChoiceAtom, useLoggedIn } from "@/api/auth";
import { hasFitbitAuthToken } from "@/storage/db/fitbitmigrationdb";

function isMigrationPath(pathname: string) {
  return (
    pathname === "/settings/migration" ||
    pathname.startsWith("/settings/migration/")
  );
}

/**
 * Send a signed-in user to the Fitbit migration page once per login while the
 * legacy Fitbit token is still stored in this browser.
 */
export function FitbitMigrationLoginRedirect() {
  const loggedIn = useLoggedIn();
  const pendingRememberMeChoice = useAtomValue(pendingRememberMeChoiceAtom);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    if (!loggedIn) {
      redirected.current = false;
      return;
    }

    if (pendingRememberMeChoice || redirected.current) {
      return;
    }

    if (!hasFitbitAuthToken()) {
      return;
    }

    redirected.current = true;

    if (isMigrationPath(pathname)) {
      return;
    }

    router.replace("/settings/migration");
  }, [loggedIn, pathname, pendingRememberMeChoice, router]);

  return null;
}
