"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  DayjsRange,
  MonthNavigator,
} from "@/components/calendar/period-navigator";
import { buildGetWeightTimeSeriesQuery } from "@/api/body";
import { WeightLog } from "@/api/body/types";
import { formatShortDate } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import {
  FRACTION_DIGITS_1,
  PERCENT_FRACTION_DIGITS_1,
} from "@/utils/number-formats";
import { HeaderBar } from "@/components/layout/rows";

function WeightLogRow({ logEntry: log }: { logEntry: WeightLog }) {
  const units = useUnits();

  return (
    <TableRow>
      <TableCell>{formatShortDate(dayjs(log.date))}</TableCell>
      <TableCell>
        {log.bmi ? <>{FRACTION_DIGITS_1.format(log.bmi)}</> : <>-</>}
      </TableCell>
      <TableCell>
        {log.fat ? (
          <>{PERCENT_FRACTION_DIGITS_1.format(log.fat / 100)} fat</>
        ) : (
          <>-</>
        )}
      </TableCell>
      <TableCell>
        {FRACTION_DIGITS_1.format(units.localizedKilograms(log.weight))}{" "}
        {units.localizedKilogramsName}
      </TableCell>
    </TableRow>
  );
}

export default function WeightLogList() {
  const [range, setRange] = useState<DayjsRange>({
    startDay: dayjs().startOf("month"),
    endDay: dayjs().endOf("month"),
  });

  const { data } = useQuery(
    buildGetWeightTimeSeriesQuery(range.startDay, range.endDay)
  );

  return (
    <div>
      <HeaderBar>
        <Typography variant="h4">Weight Logs</Typography>
        <div className="flex-1"></div>
        <MonthNavigator value={range} onChange={setRange} />
      </HeaderBar>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>BMI</TableCell>
              <TableCell>Fat %</TableCell>
              <TableCell>Weight</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((logEntry) => (
              <WeightLogRow key={logEntry.logId} logEntry={logEntry} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
