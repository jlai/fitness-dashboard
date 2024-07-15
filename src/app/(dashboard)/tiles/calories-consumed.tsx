import { useSuspenseQuery } from "@tanstack/react-query";
import { Typography } from "@mui/material";
import { Scale as ScaleIcon } from "@mui/icons-material";

import { buildFoodLogQuery } from "@/api/nutrition";
import NumericStat from "@/components/numeric-stat";

import { useSelectedDay } from "../state";

export function CaloriesConsumedTileContent() {
  const day = useSelectedDay();
  const { data: foodLog } = useSuspenseQuery(buildFoodLogQuery(day));

  const caloriesConsumed = foodLog.summary.calories;

  return (
    <div className="size-full max-h-full p-4">
      <div className="size-full flex flex-col justify-center">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 place-content-center items-center">
          <ScaleIcon className="size-3/4 [color:#5f6368]" />
        </div>
        <div className="flex flex-col items-center text-center">
          <NumericStat
            value={Math.abs(caloriesConsumed)}
            unit="Cal"
            maximumFractionDigits={0}
          />
          <Typography variant="body1">consumed</Typography>
        </div>
      </div>
    </div>
  );
}
