"use client";

import RequireLogin from "@/components/require-login";

import ManageMeals from "./manage-meals";

export default function MealSettingsPage() {
  return (
    <RequireLogin>
      <ManageMeals />
    </RequireLogin>
  );
}
