import { DialogContent, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

import type { Sleep } from "@generated/orval/fetch/google-health-api/models";

import {
  getSleepEndTime,
  getSleepMinutesAsleep,
  getSleepStartTime,
  hasStageData,
} from "@/api/sleep/helpers";
import { formatMinutes } from "@/utils/duration-formats";
import { DateFormats } from "@/utils/date-formats";

import { Hypnogram } from "./hypnogram";
import { SleepLevelSummaryChart } from "./sleep-levels-summary";

interface SleepDetailsDialogContentProps {
  sleep: Sleep;
}

export default function SleepDetailsDialogContent({
  sleep,
}: SleepDetailsDialogContentProps) {
  const startDay = dayjs(getSleepStartTime(sleep));
  const endDay = dayjs(getSleepEndTime(sleep));
  const hasLevels = hasStageData(sleep);

  return (
    <>
      <DialogContent>
        <Stack direction="column">
          <div className="mb-8 text-center">
            <Typography variant="h6">
              <Stack direction="row" columnGap={4} justifyContent="center">
                <span>Sleep: {DateFormats.TIME.format(startDay.toDate())}</span>
                <span>Wake: {DateFormats.TIME.format(endDay.toDate())}</span>
                <span>
                  Duration: {formatMinutes(getSleepMinutesAsleep(sleep))}
                </span>
              </Stack>
            </Typography>
          </div>
          {hasLevels && (
            <>
              <div className="w-full mb-8 h-[300px]">
                <Hypnogram height={300} sleep={sleep} />
              </div>
              <div className="max-w-[400px] h-[200px]">
                <SleepLevelSummaryChart sleep={sleep} />
              </div>
            </>
          )}
        </Stack>
      </DialogContent>
    </>
  );
}
