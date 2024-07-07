import { useEffect, useMemo, useRef } from "react";
import { BushyPlantGenus, SvgPlant } from "svg-plant";
import { Typography } from "@mui/material";

import { formatAsDate } from "@/api/datetime";

import { useSelectedDay } from "../state";

import { useDailySummary } from "./common";

function SvgPlantWrapper({ age, seed }: { age: number; seed: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const plantSvg = useMemo(() => {
    const genus = new BushyPlantGenus(seed);
    const plant = new SvgPlant(genus, {
      color: true,
      age,
    });

    return plant;
  }, [age, seed]);

  useEffect(() => {
    ref.current?.replaceChildren(plantSvg.svgElement);
  });

  return <div ref={ref} className="[&>svg]:mx-auto [&>svg]:max-h-full"></div>;
}

export default function PlantTileContent() {
  const day = useSelectedDay();
  const dailySummary = useDailySummary();

  const totalSteps = dailySummary.summary.steps;
  const goalSteps = dailySummary.goals?.steps ?? 10000;
  const progress = Math.min(1.0, totalSteps / goalSteps);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 text-center align-middle">
        {progress < 0.7 && (
          <Typography variant="subtitle1" component="div" className="m-8">
            Meet your step goal to grow
          </Typography>
        )}
      </div>
      <div>
        <SvgPlantWrapper age={progress} seed={formatAsDate(day)} />
      </div>
    </div>
  );
}
