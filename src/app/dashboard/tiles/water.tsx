import Image from "next/image";
import { Typography } from "@mui/material";
import { useSuspenseQueries } from "@tanstack/react-query";

import { getFoodLogQuery, getWaterGoalQuery } from "@/api/nutrition";
import { useUnits } from "@/api/units";
import NumericStat from "@/components/numeric-stat";

import { useSelectedDay } from "../state";

import Wave from "./assets/wave.svg";

export default function WaterTileContent() {
  const day = useSelectedDay();
  const units = useUnits();

  const [{ data: foodLog }, { data: waterGoalMl }] = useSuspenseQueries({
    queries: [getFoodLogQuery(day), getWaterGoalQuery()],
  });

  const { localizedWaterUnitName, localizedWaterVolume } = units;

  const waterConsumedMl = foodLog.summary.water;
  const waterConsumed = localizedWaterVolume(waterConsumedMl);
  const waterRemaining = localizedWaterVolume(waterGoalMl - waterConsumedMl);

  const ratio = Math.min(waterConsumedMl / waterGoalMl, 1.0);

  return (
    <div className="size-full max-h-full relative overflow-hidden">
      <Image
        src={Wave}
        alt=""
        className="absolute size-full opacity-20 bottom-0 object-cover"
        style={{
          transform: `translateY(${100 - ratio * 100}%)`,
        }}
      />
      <div className="absolute p-2 inset-0">
        <div className="size-full flex flex-col justify-center">
          <div className="flex flex-col items-center">
            <NumericStat value={waterRemaining} unit={localizedWaterUnitName} />
            <Typography variant="body2" component="span">
              to drink
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
