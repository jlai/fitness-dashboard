"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, Link, Paper, Tab, Tabs } from "@mui/material";
import React from "react";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

export default function MealSettingsPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname().replace("/settings/foods/", "");

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
        <Paper>
          <Tabs
            variant="scrollable"
            aria-label="food settings tabs"
            value={pathname}
          >
            <Tab
              component={Link}
              href="/settings/foods/custom"
              value="custom"
              label="Custom Foods"
            />
            <Tab
              component={Link}
              href="/settings/foods/favorite"
              value="favorite"
              label="Favorites"
            />
          </Tabs>
          {children}
        </Paper>
      </RequireScopes>
    </RequireLogin>
  );
}
