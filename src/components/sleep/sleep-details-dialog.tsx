import { DialogContent, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

import { SleepLog } from "@/api/sleep";
import { formatMinutes } from "@/utils/duration-formats";
import { DateFormats } from "@/utils/date-formats";

import { Hypnogram } from "./hypnogram";
import { SleepLevelSummaryChart } from "./sleep-levels-summary";

interface SleepDetailsDialogContentProps {
  sleepLog: SleepLog;
}

export default function SleepDetailsDialogContent({
  sleepLog,
}: SleepDetailsDialogContentProps) {
  const { levels } = sleepLog;

  const startDay = dayjs(sleepLog.startTime);
  const endDay = dayjs(sleepLog.endTime);

  const hasLevels = !!levels;

  return (
    <>
      <DialogContent>
        <Stack direction="column">
          <div className="mb-8 text-center">
            <Typography variant="h6">
              <Stack direction="row" columnGap={4} justifyContent="center">
                <span>Sleep: {DateFormats.TIME.format(startDay.toDate())}</span>
                <span>Wake: {DateFormats.TIME.format(endDay.toDate())}</span>
                <span>Duration: {formatMinutes(sleepLog.minutesAsleep)}</span>
              </Stack>
            </Typography>
          </div>
          {hasLevels && (
            <>
              <div className="w-full mb-8 h-[300px]">
                <Hypnogram height={300} sleepLog={sleepLog} />
              </div>
              <div className="max-w-[400px] h-[200px]">
                <SleepLevelSummaryChart levels={levels} />
              </div>
            </>
          )}
        </Stack>
      </DialogContent>
    </>
  );
}
