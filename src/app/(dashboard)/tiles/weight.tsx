import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowDropDown,
  ArrowDropUp,
  MonitorWeight,
  MoreHoriz,
} from "@mui/icons-material";
import { head } from "es-toolkit";
import { DatePicker } from "@mui/x-date-pickers";
import { useState } from "react";

import NumericStat from "@/components/numeric-stat";
import { buildGetWeightLogsQuery } from "@/api/body";
import { useUnits } from "@/config/units";
import { WeightLog } from "@/api/body/types";
import { formatShortDate } from "@/utils/date-formats";
import {
  FRACTION_DIGITS_1,
  PERCENT_FRACTION_DIGITS_1,
} from "@/utils/number-formats";
import { formatAsDate } from "@/api/datetime";

import { useSelectedDay } from "../state";

import { RenderDialogContentProps, TileWithDialog } from "./tile-with-dialog";

// See https://dev.fitbit.com/build/reference/web-api/body-timeseries/get-weight-timeseries-by-date-range/
const MAX_WEIGHT_LOG_DAYS = 31;

export function WeightTileContent() {
  const { localizedKilogramsName, weightUnit } = useUnits();
  const day = useSelectedDay();

  const { data } = useSuspenseQuery(
    buildGetWeightLogsQuery(
      day.subtract(MAX_WEIGHT_LOG_DAYS, "days"),
      day,
      weightUnit
    )
  );

  let latest: WeightLog | undefined = undefined;

  for (const datum of data) {
    if (dayjs(datum.date).isAfter(day)) {
      break;
    }

    latest = datum;
  }

  return (
    <TileWithDialog
      dialogComponent={(props) => (
        <WeightTileDialogContent {...props} latest={latest} data={data} />
      )}
      dialogProps={{ maxWidth: "sm", fullWidth: true }}
    >
      <Stack
        direction="column"
        className="size-full p-4"
        alignItems="center"
        justifyContent="center"
      >
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <MonitorWeight className="size-3/4" />
        </div>
        <NumericStat value={latest?.weight} unit={localizedKilogramsName} />
      </Stack>
    </TileWithDialog>
  );
}

function WeightTileDialogContent({
  closeButton,
  latest,
  data,
}: RenderDialogContentProps & {
  latest?: WeightLog;
  data: Array<WeightLog>;
}) {
  const earliest = head(data);

  const [pastDay, setPastDay] = useState(
    earliest ? dayjs(earliest.date) : null
  );

  const pastLog = data.find((datum) => dayjs(datum.date).isSame(pastDay));
  const validDates = new Set(data.map((datum) => datum.date));

  return (
    <>
      <DialogTitle>Weight</DialogTitle>
      <DialogContent>
        <Box marginBottom={2}>
          <Typography>
            Pick a previous day to compare against. Must be within{" "}
            {MAX_WEIGHT_LOG_DAYS} days and have a logged weight.
          </Typography>
        </Box>
        <DatePicker
          label="Compare to date"
          value={pastDay}
          onAccept={setPastDay}
          minDate={earliest && dayjs(earliest.date)}
          maxDate={latest && dayjs(latest.date).subtract(1, "day")}
          shouldDisableDate={(day) => !validDates.has(formatAsDate(day))}
        />
        <Divider sx={{ marginBlock: "16px" }} />
        <Stack direction="row" gap={2} justifyContent="center">
          {!latest && (
            <Typography>
              No weight logs in the last {MAX_WEIGHT_LOG_DAYS} days.
            </Typography>
          )}
          {pastLog && pastLog !== latest && (
            <WeightLogCard weightLog={pastLog} />
          )}
          {pastLog && latest && (
            <Stack
              direction="column"
              alignItems="center"
              justifyContent="center"
              marginInline={2}
            >
              <MoreHoriz />
            </Stack>
          )}
          {latest && <WeightLogCard weightLog={latest} previous={pastLog} />}
        </Stack>
      </DialogContent>
      <DialogActions>{closeButton}</DialogActions>
    </>
  );
}

function WeightLogCard({
  weightLog,
  previous,
}: {
  weightLog: WeightLog;
  previous?: WeightLog;
}) {
  const { localizedKilogramsName } = useUnits();
  const daysAgo = dayjs().diff(dayjs(weightLog.date), "days");

  return (
    <Card variant="outlined" className="p-2">
      <CardHeader
        title={formatShortDate(dayjs(weightLog.date))}
        subheader={daysAgo === 0 ? "Today" : `${daysAgo} days ago`}
      />
      <CardContent>
        <Stack direction="column">
          <Stack direction="row" alignItems="center" columnGap={2}>
            <Typography variant="h6">
              {weightLog.weight} {localizedKilogramsName}
            </Typography>
            {previous && previous.weight !== weightLog.weight && (
              <Box>
                (
                <Typography variant="h6" component="span" className="me-2">
                  {weightLog.weight > previous.weight ? (
                    <ArrowDropUp className="mx-0 text-slate-500" />
                  ) : (
                    <ArrowDropDown className="mx-0 text-slate-500" />
                  )}
                  {FRACTION_DIGITS_1.format(
                    Math.abs(weightLog.weight - previous.weight)
                  )}{" "}
                  {localizedKilogramsName}
                </Typography>
                )
              </Box>
            )}
          </Stack>
          <div className="h-[1em]"></div>
          {weightLog.fat && (
            <Typography>
              {PERCENT_FRACTION_DIGITS_1.format(weightLog.fat / 100)} fat
            </Typography>
          )}

          {weightLog.bmi && (
            <Typography>
              {FRACTION_DIGITS_1.format(weightLog.bmi)} BMI
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
