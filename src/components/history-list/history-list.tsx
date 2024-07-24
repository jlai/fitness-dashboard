import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Skeleton,
  TableFooter,
  TablePagination,
} from "@mui/material";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { useState, useCallback } from "react";

import JumpTo from "../jump-to";

interface LogEntryWithId {
  logId: number;
}

interface RowElementProps<Log> {
  logEntry: Log;
}

interface HistoryListProps<Response, Log extends LogEntryWithId> {
  buildQuery: (
    initialDay: Dayjs,
    pageSize: number
  ) => UseInfiniteQueryOptions<
    Response,
    Error,
    InfiniteData<Response>,
    Response,
    (string | number)[], // query key type
    string
  >;
  getLogs: (response: Response) => Array<Log>;
  slots: {
    row: React.JSXElementConstructor<RowElementProps<Log>>;
    headerCells: React.JSXElementConstructor<{}>;
  };
}

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default function HistoryList<Response, Log extends LogEntryWithId>({
  buildQuery,
  getLogs,
  slots: { row: Row, headerCells: HeaderCells },
}: HistoryListProps<Response, Log>) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageNumber, setPageNumber] = useState(0);
  const [initialDay, setInitialDay] = useState(dayjs());

  const { data, hasNextPage, fetchNextPage, isFetching, refetch } =
    useInfiniteQuery(buildQuery(initialDay, pageSize));

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

  const changeInitialDay = useCallback(
    (value: Dayjs | null) => {
      setInitialDay(value ?? dayjs());
      setPageNumber(0);
    },
    [setPageNumber, setInitialDay]
  );

  const updatePageSize = (size: number) => {
    setPageSize(size);
    setPageNumber(0);
    refetch();
  };

  const page = data?.pages[pageNumber];
  const logEntries = (page && getLogs(page)) ?? [];

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <HeaderCells />
          </TableRow>
        </TableHead>
        <TableBody>
          {logEntries.map((log) => (
            <Row key={log.logId} logEntry={log} />
          ))}
          {[...Array(pageSize - logEntries.length).fill(0)].map((_, i) => (
            <TableRow key={`filler-${i}`}>
              <TableCell colSpan={1000}>
                {isFetching ? <Skeleton variant="text" /> : " "}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <JumpTo onPickDay={(day) => changeInitialDay(day)} />
            </TableCell>
            <TablePagination
              colSpan={5}
              count={
                hasNextPage
                  ? -1
                  : data?.pages.reduce(
                      (acc, page) => acc + getLogs(page).length,
                      0
                    ) ?? -1
              }
              rowsPerPageOptions={ALLOWED_PAGE_SIZES}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) =>
                updatePageSize(Number(event.target.value))
              }
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
