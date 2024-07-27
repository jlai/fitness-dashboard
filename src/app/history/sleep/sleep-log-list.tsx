import { Dialog, TableCell, TableRow } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import {
  bindDialog,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { lazy, Suspense } from "react";

import { TIME } from "@/utils/date-formats";
import { SleepLog } from "@/api/sleep/types";
import NumericStat from "@/components/numeric-stat";
import HistoryList from "@/components/history-list/history-list";
import { buildGetSleepLogListInfiniteQuery } from "@/api/sleep";
import { SleepLevelMiniSummary } from "@/components/sleep/sleep-levels-mini";

const SleepDetailsDialogContent = lazy(
  () => import("@/components/sleep/sleep-details-dialog")
);

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

function SleepLogListHeaderCells() {
  return (
    <>
      <TableCell>Date</TableCell>
      <TableCell className="text-end">Time</TableCell>
      <TableCell className="text-center hidden md:table-cell">
        Time in stages
      </TableCell>
      <TableCell className="text-end max-w-full">Duration</TableCell>
    </>
  );
}

function SleepLogRow({ logEntry: sleep }: { logEntry: SleepLog }) {
  const startTime = new Date(sleep.startTime);
  const endTime = new Date(sleep.endTime);

  const popupState = usePopupState({
    popupId: "sleep-log-details",
    variant: "dialog",
  });

  return (
    <TableRow className="w-full">
      <TableCell className="min-w-max">
        <button
          className="block text-start w-full"
          {...bindTrigger(popupState)}
        >
          {formatDay(dayjs(endTime), { weekday: "short" })}
        </button>
      </TableCell>
      <TableCell className="text-end">
        {TIME.format(startTime)} &ndash; {TIME.format(endTime)}
      </TableCell>
      <TableCell className="hidden md:table-cell md:w-[200px]">
        {sleep.levels && (
          <button className="block size-full" {...bindTrigger(popupState)}>
            <div className="w-full h-[20px]">
              <SleepLevelMiniSummary levels={sleep.levels} />
            </div>
          </button>
        )}
      </TableCell>
      <TableCell className="flex flex-row justify-end max-w-full">
        <SleepDuration minutesAsleep={sleep.minutesAsleep} />
      </TableCell>

      {popupState.isOpen && (
        <Suspense>
          <Dialog {...bindDialog(popupState)} fullWidth maxWidth="lg">
            <SleepDetailsDialogContent sleepLog={sleep} />
          </Dialog>
        </Suspense>
      )}
    </TableRow>
  );
}

export default function SleepLogList() {
  return (
    <HistoryList
      buildQuery={buildGetSleepLogListInfiniteQuery}
      getLogs={(page) => page.sleep}
      slots={{ row: SleepLogRow, headerCells: SleepLogListHeaderCells }}
    />
  );
}

export function formatDay(day: Dayjs, options?: Intl.DateTimeFormatOptions) {
  const today = dayjs();
  const isSameYear = day.isSame(today, "year");
  const isSameWeek = day.isSame(today, "week");

  return new Intl.DateTimeFormat(undefined, {
    ...options,
    weekday: "short",
    day: isSameWeek ? undefined : options?.day ?? "numeric",
    month: isSameWeek ? undefined : options?.month ?? "long",
    year: isSameYear ? undefined : "numeric",
  }).format(day.toDate());
}
