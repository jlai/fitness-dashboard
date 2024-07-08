import {
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TableFooter,
  Skeleton,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import dayjs from "dayjs";

import { makeRequest } from "@/api/request";
import { formatShortDateTime } from "@/utils/date-formats";
import { SleepLog, GetSleepLogListResponse } from "@/api/sleep/types";
import NumericStat from "@/components/numeric-stat";

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

export default function SleepLogList() {
  const [pageNumber, setPageNumber] = useState(0);

  const { data, hasNextPage, fetchNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["sleep-log-list"],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=10&offset=0&sort=desc&beforeDate=${encodeURIComponent(
          new Date().toISOString().replace("Z", "")
        )}`;

      const response = await makeRequest(
        `/1.2/user/-/sleep/list.json?${queryString}`
      );
      return (await response.json()) as GetSleepLogListResponse;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.next
        ? new URL(lastPage.pagination.next).search.replace(/^\?/, "")
        : null,
    initialPageParam: "",
  });

  const numLoadedPages = data?.pages.length ?? 0;

  const changePageNumber = useCallback(
    (newPageNumber: number) => {
      if (newPageNumber > numLoadedPages - 1) {
        fetchNextPage();
      }

      setPageNumber(newPageNumber);
    },
    [setPageNumber, fetchNextPage, numLoadedPages]
  );

  const page = data?.pages[pageNumber];

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {page?.sleep.map((sleep) => (
            <TableRow key={sleep.logId}>
              <TableCell>
                {formatShortDateTime(dayjs(sleep.startTime))}
              </TableCell>
              <TableCell>{formatSleepTimeRange(sleep)}</TableCell>
              <TableCell>
                <SleepDuration minutesAsleep={sleep.minutesAsleep} />
              </TableCell>
            </TableRow>
          ))}
          {[...Array(10 - (page?.sleep.length ?? 0)).fill(0)].map((_, i) => (
            <TableRow key={`filler-${i}`}>
              <TableCell colSpan={3}>
                {isFetching ? <Skeleton variant="text" /> : " "}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              count={
                hasNextPage
                  ? -1
                  : data?.pages.reduce(
                      (acc, page) => acc + page.sleep.length,
                      0
                    ) ?? -1
              }
              rowsPerPageOptions={[]}
              rowsPerPage={10}
              page={pageNumber}
              onPageChange={(event, newPageNumber) =>
                changePageNumber(newPageNumber)
              }
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}
