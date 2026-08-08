"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Login uses Google's Code Client popup on the page that starts auth, so this
 * route is unused. Keep it as a safe redirect for old bookmarks / links.
 */
export default function LoginCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
