import { DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

import { SleepLog } from "@/api/sleep";
import { formatMinutes, formatShortDateTime, TIME } from "@/utils/date-formats";

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

  const hasSleepStages = levels?.summary?.rem;

  return (
    <>
      <DialogTitle align="center">
        Sleep ending {formatShortDateTime(endDay)}
      </DialogTitle>
      <DialogContent>
        <Stack direction="column">
          <div className="mb-8 text-center">
            <Typography variant="h6">
              <Stack direction="row" columnGap={4} justifyContent="center">
                <span>Sleep: {TIME.format(startDay.toDate())}</span>
                <span>Wake: {TIME.format(endDay.toDate())}</span>
                <span>Duration: {formatMinutes(sleepLog.minutesAsleep)}</span>
              </Stack>
            </Typography>
          </div>
          {hasSleepStages && (
            <>
              <div className="w-full mb-8 h-[300px]">
                <Hypnogram height={300} sleepLog={sleepLog} />
              </div>
              <div className="w-[400px] h-[200px]">
                <SleepLevelSummaryChart levels={levels} />
              </div>
            </>
          )}
        </Stack>
      </DialogContent>
    </>
  );
}
