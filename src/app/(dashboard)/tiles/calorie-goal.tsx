import Image from "next/image";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Typography } from "@mui/material";

import { buildFoodLogQuery } from "@/api/nutrition";
import NumericStat from "@/components/numeric-stat";

import { useSelectedDay } from "../state";

import foodIcon from "./assets/restaurant_24dp_FILL0_wght400_GRAD0_opsz24.svg";

export function CalorieGoalTileContent() {
  const day = useSelectedDay();
  const { data: foodLog } = useSuspenseQuery(buildFoodLogQuery(day));

  const caloriesGoal = foodLog.goals?.calories;
  const caloriesConsumed = foodLog.summary.calories;
  const caloriesRemaining = (caloriesGoal ?? 0) - caloriesConsumed;

  const isPastGoal = caloriesRemaining < 0;

  return (
    <div className="size-full max-h-full p-4">
      <div className="size-full flex flex-col justify-center">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 place-content-center items-center">
          <Image src={foodIcon} alt="" className="size-1/2" />
        </div>
        <div className="flex flex-col items-center text-center">
          <NumericStat
            value={Math.abs(caloriesRemaining)}
            unit="calories"
            maximumFractionDigits={0}
          />
          {isPastGoal ? (
            <Typography variant="body2" component="span">
              over
            </Typography>
          ) : (
            <Typography variant="body2" component="span">
              to eat
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
