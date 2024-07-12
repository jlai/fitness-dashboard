import { TableCell, TableRow } from "@mui/material";
import dayjs from "dayjs";

import { formatShortDateTime } from "@/utils/date-formats";
import { SleepLog } from "@/api/sleep/types";
import NumericStat from "@/components/numeric-stat";
import HistoryList from "@/components/history-list/history-list";
import { buildGetSleepLogListInfiniteQuery } from "@/api/sleep";

function formatSleepTimeRange(sleep: SleepLog) {
  const format = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
  });

  return format.formatRange(
    dayjs(sleep.startTime).toDate(),
    dayjs(sleep.endTime).toDate()
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

function SleepLogListHeaderCells() {
  return (
    <>
      <TableCell>Date</TableCell>
      <TableCell>Time</TableCell>
      <TableCell>Duration</TableCell>
    </>
  );
}

function SleepLogRow({ logEntry: sleep }: { logEntry: SleepLog }) {
  return (
    <TableRow>
      <TableCell>{formatShortDateTime(dayjs(sleep.startTime))}</TableCell>
      <TableCell>{formatSleepTimeRange(sleep)}</TableCell>
      <TableCell>
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
