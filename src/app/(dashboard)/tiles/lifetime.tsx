import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";

import { buildLifetimeStatsQuery, type LifetimeStat } from "@/api/exercise";
import { NumberFormats } from "@/utils/number-formats";
import { useUnits } from "@/config/units";

import { useTileData } from "./tile";

const ENABLE_LIFETIME_STATS = false as boolean;

function lifetimeStatForTile(type: string): LifetimeStat {
  switch (type) {
    case "lifetimeDistance":
      return "distance";
    case "lifetimeFloors":
      return "floors";
    default:
      return "steps";
  }
}

export function LifetimeTileContent() {
  if (!ENABLE_LIFETIME_STATS) {
    return (
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        className="h-full p-2"
      >
        <Typography variant="body2" className="text-center">
          Lifetime stats not implemented yet.
        </Typography>
      </Stack>
    );
  }

  return <LifetimeStatsTileContent />;
}

function LifetimeStatsTileContent() {
  const { type, w = 1 } = useTileData();
  const { localizedKilometers, localizedKilometersNameLong } = useUnits();
  const dataType = lifetimeStatForTile(type);

  const { data: total } = useSuspenseQuery(buildLifetimeStatsQuery(dataType));

  let value = total;
  let label = "";

  switch (type) {
    case "lifetimeSteps":
      label = "lifetime steps";
      break;
    case "lifetimeDistance":
      value = localizedKilometers(total);
      label = `lifetime ${localizedKilometersNameLong}`;
      break;
    case "lifetimeFloors":
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
          {NumberFormats.FRACTION_DIGITS_0.format(value)}
        </Typography>
        <Typography variant={w > 1 ? "h6" : "subtitle1"}>{label}</Typography>
      </Stack>
    </Stack>
  );
}
