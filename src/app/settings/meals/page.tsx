"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";
import { NUTRITION_READONLY } from "@/config/google-health-scopes";

import ManageMeals from "./manage-meals";

export default function MealSettingsPage() {
  const router = useRouter();

  return (
    <RequireLogin>
      <RequireScopes scopes={[NUTRITION_READONLY]}>
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
