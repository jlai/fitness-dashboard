"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";

import { handleAuthCallback, hasTokenScope } from "@/api/auth";
import { allUnitsConfiguredAtom } from "@/storage/settings";

export default function LoginCallbackPage() {
  const router = useRouter();
  const allUnitsConfigured = useAtomValue(allUnitsConfiguredAtom);

  useEffect(() => {
    handleAuthCallback().then(() => {
      if (!hasTokenScope("pro") && !allUnitsConfigured) {
        router.replace("/settings");
      } else {
        // FIXME track redirect url
        router.replace("/");
      }
    });
  }, [router, allUnitsConfigured]);
}
