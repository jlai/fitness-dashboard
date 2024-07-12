import { TableCell, TableRow } from "@mui/material";
import dayjs from "dayjs";

import { formatShortDate } from "@/utils/date-formats";
import { SleepLog } from "@/api/sleep/types";
import NumericStat from "@/components/numeric-stat";
import HistoryList from "@/components/history-list/history-list";
import { buildGetSleepLogListInfiniteQuery } from "@/api/sleep";

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
      <TableCell className="text-end max-w-full">Duration</TableCell>
    </>
  );
}

const WEEKDAY_AND_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

function SleepLogRow({ logEntry: sleep }: { logEntry: SleepLog }) {
  const startTime = new Date(sleep.startTime);
  const endTime = new Date(sleep.endTime);

  return (
    <TableRow className="w-full">
      <TableCell>{formatShortDate(dayjs(endTime))}</TableCell>
      <TableCell className="text-end">
        {WEEKDAY_AND_TIME_FORMAT.formatRange(startTime, endTime)}
      </TableCell>
      <TableCell className="flex flex-row justify-end max-w-full">
        <SleepDuration minutesAsleep={sleep.minutesAsleep} />
      </TableCell>
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
