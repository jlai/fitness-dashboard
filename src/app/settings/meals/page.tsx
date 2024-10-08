"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

import ManageMeals from "./manage-meals";

export default function MealSettingsPage() {
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

        <ManageMeals />
      </RequireScopes>
    </RequireLogin>
  );
}
