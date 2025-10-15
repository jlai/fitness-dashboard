"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import dayjs from "dayjs";

import { handleAuthCallback, hasTokenScope } from "@/api/auth";
import { allowAPIProxyAtom, allUnitsConfiguredAtom } from "@/storage/settings";
import { firstLoginDateAtom } from "@/storage/analytics";
import { formatAsDate } from "@/api/datetime";

export default function LoginCallbackPage() {
  const router = useRouter();
  const allUnitsConfigured = useAtomValue(allUnitsConfiguredAtom);
  const [firstLoginDate, setFirstLoginDate] = useAtom(firstLoginDateAtom);
  const setAllowAPIProxy = useSetAtom(allowAPIProxyAtom);

  useEffect(() => {
    handleAuthCallback().then(() => {
      if (!firstLoginDate) {
        setFirstLoginDate(formatAsDate(dayjs()));

        // Newly set up accounts enable API proxy
        setAllowAPIProxy(true);
      }

      if (!hasTokenScope("pro") && !allUnitsConfigured) {
        router.replace("/settings");
      } else {
        // FIXME track redirect url
        router.replace("/");
      }
    });
  }, [
    router,
    allUnitsConfigured,
    firstLoginDate,
    setFirstLoginDate,
    setAllowAPIProxy,
  ]);
}
