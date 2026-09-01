"use client";

import { useRouter } from "next/navigation";
import { Button, Paper } from "@mui/material";
import React from "react";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

export default function MealSettingsPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <RequireLogin>
      <RequireScopes scopes={["nut"]}>
        <div className="mb-4">
          <Button
            onClick={() => {
              router.back();
            }}
          >
            Back
          </Button>
        </div>
        <Paper>{children}</Paper>
      </RequireScopes>
    </RequireLogin>
  );
}
