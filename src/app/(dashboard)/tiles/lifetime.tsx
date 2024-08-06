import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";

import { buildLifetimeStatsQuery } from "@/api/activity";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { useUnits } from "@/config/units";

import { useTileData } from "./tile";

export function LifetimeTileContent() {
  const { type, w = 1 } = useTileData();
  const { localizedKilometers, localizedKilometersNameLong } = useUnits();

  const {
    data: { lifetime },
  } = useSuspenseQuery(buildLifetimeStatsQuery());

  let value = -1;
  let label = "";

  switch (type) {
    case "lifetimeSteps":
      value = lifetime.tracker.steps;
      label = "lifetime steps";
      break;
    case "lifetimeDistance":
      value = localizedKilometers(lifetime.tracker.distance);
      label = `lifetime ${localizedKilometersNameLong}`;
      break;
    case "lifetimeFloors":
      value = localizedKilometers(lifetime.tracker.floors);
      label = "lifetime floors";
      break;
  }

  const useRow = w > 2;

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      className="h-full"
    >
      <Stack
        direction={useRow ? "row" : "column"}
        flexWrap="wrap"
        alignItems={useRow ? "baseline" : "center"}
        justifyContent="center"
        columnGap={2}
        rowGap={0}
        className="text-center"
      >
        <Typography variant={w > 1 ? "h3" : "h6"}>
          {FRACTION_DIGITS_0.format(value)}
        </Typography>
        <Typography variant={w > 1 ? "h6" : "subtitle1"}>{label}</Typography>
      </Stack>
    </Stack>
  );
}
