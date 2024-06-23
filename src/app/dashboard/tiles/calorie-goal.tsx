import Image from "next/image";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Typography } from "@mui/material";

import { getFoodLogQuery } from "@/api/nutrition";
import NumericSTat from "@/components/numeric-stat";

import { useSelectedDay } from "../state";

import foodIcon from "./assets/restaurant_24dp_FILL0_wght400_GRAD0_opsz24.svg";

export function CalorieGoalTileContent() {
  const day = useSelectedDay();
  const { data: foodLog } = useSuspenseQuery(getFoodLogQuery(day));

  const caloriesGoal = foodLog.goals?.calories;
  const caloriesConsumed = foodLog.summary.calories;
  const caloriesRemaining = (caloriesGoal ?? 0) - caloriesConsumed;

  const isPastGoal = caloriesRemaining < 0;

  return (
    <div className="size-full max-h-full p-2">
      <div className="size-full flex flex-col justify-center">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 place-content-center items-center">
          <Image src={foodIcon} alt="" className="size-1/2" />
        </div>
        <div className="flex flex-col items-center">
          <NumericSTat
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
