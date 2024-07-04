"use client";

import { Suspense, useState } from "react";
import { Paper } from "@mui/material";
import dayjs from "dayjs";

import NutritionLogger from "@/components/nutrition/nutrition-logger";
import DayNavigator from "@/components/day-navigator";
import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

import FoodLog from "./food-log";

export default function FoodPage() {
  const [selectedDay, setSelectedDay] = useState(dayjs());

  return (
    <RequireLogin>
      <RequireScopes scopes={["pro", "nut"]}>
        <div className="space-y-8">
          <Paper>
            <Suspense>
              <NutritionLogger />
            </Suspense>
          </Paper>
          <DayNavigator
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
          <Paper>
            <Suspense>
              <FoodLog day={selectedDay} />
            </Suspense>
          </Paper>
        </div>
      </RequireScopes>
    </RequireLogin>
  );
}
