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
  IconButton,
  Dialog,
  DialogContent,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import dayjs from "dayjs";
import { Explore as LaunchIcon } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { ActivityLog, ActivityLogListResponse } from "@/api/activity/types";
import { makeRequest } from "@/api/request";
import { formatDuration, formatShortDateTime } from "@/utils/date-formats";
import { useUnits } from "@/api/units";

import { ActivityDetails } from "./activity-details";

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const DISTANCE_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

export default function Activities() {
  const [selectedActivityLog, setSelectedActivityLog] =
    useState<ActivityLog | null>(null);

  return (
    <>
      <ActivityList onShowActivityLog={setSelectedActivityLog} />
      <Dialog
        fullWidth
        maxWidth="xl"
        open={!!selectedActivityLog}
        onClose={() => setSelectedActivityLog(null)}
      >
        <DialogContent>
          <RequireScopes scopes={["loc"]}>
            {selectedActivityLog && (
              <ActivityDetails activityLog={selectedActivityLog} />
            )}
          </RequireScopes>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ActivityList({
  onShowActivityLog,
}: {
  onShowActivityLog: (activityLog: ActivityLog) => void;
}) {
  const [pageNumber, setPageNumber] = useState(0);
  const units = useUnits();

  const { data, hasNextPage, fetchNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["activities"],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=10&offset=0&sort=desc&beforeDate=${encodeURIComponent(
          new Date().toISOString().replace("Z", "")
        )}`;

      const response = await makeRequest(
        `/1/user/-/activities/list.json?${queryString}`
      );
      return (await response.json()) as ActivityLogListResponse;
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
            <TableCell>Activity</TableCell>
            <TableCell>Steps</TableCell>
            <TableCell>Distance</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Calories</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {page?.activities.map((activity) => (
            <TableRow key={activity.logId}>
              <TableCell className="flex flex-row items-center gap-x-2">
                <div>{formatShortDateTime(dayjs(activity.startTime))}</div>
                {activity.distance && (
                  <IconButton
                    size="small"
                    onClick={() => onShowActivityLog(activity)}
                  >
                    <LaunchIcon />
                  </IconButton>
                )}
              </TableCell>
              <TableCell>{activity.activityName}</TableCell>
              <TableCell>{NUMBER_FORMAT.format(activity.steps)}</TableCell>
              <TableCell>
                {activity.distance ? (
                  <div>
                    {DISTANCE_FORMAT.format(
                      units.localizedKilometers(activity.distance)
                    )}{" "}
                    {units.localizedKilometersName}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{formatDuration(activity.duration)}</TableCell>
              <TableCell>{NUMBER_FORMAT.format(activity.calories)}</TableCell>
            </TableRow>
          ))}
          {[...Array(10 - (page?.activities.length ?? 0)).fill(0)].map(
            (_, i) => (
              <TableRow key={`filler-${i}`}>
                <TableCell colSpan={6}>
                  {isFetching ? <Skeleton variant="text" /> : " "}
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              count={
                hasNextPage
                  ? -1
                  : data?.pages.reduce(
                      (acc, page) => acc + page.activities.length,
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
