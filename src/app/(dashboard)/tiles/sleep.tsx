import { useSuspenseQuery } from "@tanstack/react-query";
import { sumBy } from "lodash";
import { Stack, Typography } from "@mui/material";
import Image from "next/image";

import NumericStat from "@/components/numeric-stat";
import { TIME } from "@/utils/date-formats";
import { buildGetSleepLogByDateQuery } from "@/api/sleep";

import { useSelectedDay } from "../state";

import sleepIconUrl from "./assets/icon-park-outline--sleep.svg";

export function SleepTileContent() {
  const selectedDay = useSelectedDay();
  const { data: sleepLogs } = useSuspenseQuery(
    buildGetSleepLogByDateQuery(selectedDay)
  );

  const totalMinutes = sumBy(sleepLogs, "minutesAsleep");

  if (sleepLogs.length === 0) {
    return <NoSleep />;
  }

  const mainSleep = sleepLogs.find((sleep) => sleep.isMainSleep);

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      paddingBlock={4}
    >
      <div>
        {mainSleep && (
          <Typography variant="subtitle1">
            {TIME.format(new Date(mainSleep.startTime))} &ndash;{" "}
            {TIME.format(new Date(mainSleep.endTime))}
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
      <Typography variant="h6">No sleep recorded</Typography>
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
