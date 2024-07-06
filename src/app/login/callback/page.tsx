"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { handleAuthCallback } from "@/api/auth";

export default function LoginCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    handleAuthCallback().then(() => {
      // FIXME track redirect url
      router.replace("/");
    });
  }, [router]);
}
