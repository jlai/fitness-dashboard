import { useSuspenseQuery } from "@tanstack/react-query";
import { sumBy } from "es-toolkit";
import { Stack, Typography } from "@mui/material";
import Image from "next/image";

import NumericStat from "@/components/numeric-stat";
import { DateFormats } from "@/utils/date-formats";
import { buildGetSleepLogByDateQuery } from "@/api/sleep";
import {
  getSleepEndTime,
  getSleepFromDataPoint,
  getSleepMinutesAsleep,
  getSleepStartTime,
  isMainSleep,
} from "@/api/sleep/helpers";
import SleepDetailsDialogContent from "@/components/sleep/sleep-details-dialog";

import { useSelectedDay } from "../state";

import sleepIconUrl from "./assets/icon-park-outline--sleep.svg";
import { TileWithDialog } from "./tile-with-dialog";

export function SleepTileContent() {
  const selectedDay = useSelectedDay();
  const { data: sleepDataPoints = [] } = useSuspenseQuery(
    buildGetSleepLogByDateQuery(selectedDay)
  );

  const totalMinutes = sumBy(sleepDataPoints, (dataPoint) =>
    getSleepMinutesAsleep(getSleepFromDataPoint(dataPoint))
  );

  if (sleepDataPoints.length === 0) {
    return <NoSleep />;
  }

  const mainSleepDataPoint = sleepDataPoints.find((dataPoint) =>
    isMainSleep(getSleepFromDataPoint(dataPoint))
  );
  const mainSleep = mainSleepDataPoint
    ? getSleepFromDataPoint(mainSleepDataPoint)
    : undefined;

  return (
    <TileWithDialog
      disableDialog={!mainSleep}
      dialogComponent={() =>
        mainSleep && <SleepTileDialogContent sleep={mainSleep} />
      }
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        paddingBlock={4}
      >
        <div>
          {mainSleep && (
            <Typography
              variant="subtitle1"
              className="text-center text-balance"
            >
              <span className="wrap">
                {DateFormats.TIME.format(
                  new Date(getSleepStartTime(mainSleep))
                )}
              </span>
              <span> &ndash; </span>
              <span>
                {DateFormats.TIME.format(new Date(getSleepEndTime(mainSleep)))}
              </span>
            </Typography>
          )}
        </div>
        <div className="flex-1">
          <Image
            src={sleepIconUrl}
            alt=""
            className="w-full h-full text-slate-200"
          />
        </div>
        <div>
          <SleepDuration minutesAsleep={totalMinutes} />
        </div>
      </Stack>
    </TileWithDialog>
  );
}

function NoSleep() {
  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
    >
      <Typography variant="h6" className="text-center">
        No sleep recorded
      </Typography>
    </Stack>
  );
}

function SleepDuration({ minutesAsleep }: { minutesAsleep: number }) {
  const hours = Math.floor(minutesAsleep / 60);
  const minutes = Math.floor(minutesAsleep % 60);

  return (
    <div className="flex flex-row gap-x-2">
      <NumericStat value={hours} unit="hours" />
      <NumericStat value={minutes} unit="min" />
    </div>
  );
}

function SleepTileDialogContent({
  sleep,
}: {
  sleep: ReturnType<typeof getSleepFromDataPoint>;
}) {
  return <SleepDetailsDialogContent sleep={sleep} />;
}
