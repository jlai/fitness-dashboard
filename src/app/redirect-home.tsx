"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Temporary client-side redirect to the home page (static export compatible). */
export default function RedirectHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
