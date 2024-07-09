"use client";

import { Suspense, useState } from "react";
import { Paper } from "@mui/material";
import dayjs from "dayjs";
import { ScopeProvider } from "jotai-scope";
import { useAtom } from "jotai";

import NutritionLogger from "@/components/nutrition/nutrition-logger";
import DayNavigator from "@/components/day-navigator";
import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";
import { selectedDayForPageAtom } from "@/state";

import FoodLog from "./food-log";

function NutritionPageContent() {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayForPageAtom);

  return (
    <div className="space-y-8">
      <Paper>
        <Suspense>
          <NutritionLogger />
        </Suspense>
      </Paper>
      <DayNavigator selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      <Suspense>
        <FoodLog day={selectedDay} />
      </Suspense>
    </div>
  );
}

export default function NutritionPage() {
  return (
    <RequireLogin>
      <RequireScopes scopes={["nut"]}>
        <ScopeProvider atoms={[selectedDayForPageAtom]}>
          <NutritionPageContent />
        </ScopeProvider>
      </RequireScopes>
    </RequireLogin>
  );
}
