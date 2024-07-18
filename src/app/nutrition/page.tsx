"use client";

import { Suspense } from "react";
import { Paper, Typography } from "@mui/material";
import { ScopeProvider } from "jotai-scope";
import { useAtom } from "jotai";
import { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";

import NutritionLogger from "@/components/nutrition/nutrition-logger";
import DayNavigator from "@/components/day-navigator";
import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";
import { selectedDayForPageAtom } from "@/state";
import { HeaderBar } from "@/components/layout/rows";
import { buildFoodLogQuery } from "@/api/nutrition";

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
      <HeaderBar marginInlineStart={0} marginInlineEnd={2}>
        <DayNavigator selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <div className="flex-1"></div>
        <FoodQuickSummary selectedDay={selectedDay} />
      </HeaderBar>
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

function FoodQuickSummary({ selectedDay }: { selectedDay: Dayjs }) {
  const { data } = useQuery(buildFoodLogQuery(selectedDay));

  return (
    <Typography variant="subtitle1" className="text-2xl">
      <span>{data?.summary.calories ?? "\u2014"} Calories</span>
    </Typography>
  );
}
