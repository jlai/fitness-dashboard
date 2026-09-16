"use client";

import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout } from "@/api/auth";

/** Confirm account switch, disable Google auto sign-in, log out, and go home. */
export function useSwitchAccounts() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    confirm({
      title: "Switch accounts",
      description:
        "Sign out of your current account on this website and sign in again?",
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
