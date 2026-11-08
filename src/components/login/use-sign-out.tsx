"use client";

import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout } from "@/api/auth";

/** Confirm sign-out, then clear caches and leave. */
export function useSignOut() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    confirm({
      title: "Sign out",
      description: "Sign out of your Google account on this website?",
      confirmationText: "Sign out",
    }).then(async ({ confirmed }) => {
      if (!confirmed) {
        return;
      }

      await logout();
      queryClient.clear();
      router.replace("/");
    });
  };
}
