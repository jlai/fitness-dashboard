import { useSuspenseQuery } from "@tanstack/react-query";
import { DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { LineChart, SparkLineChart, PiecewiseColorLegend } from "@mui/x-charts";
import { map } from "lodash";

import { buildHeartRateIntradayQuery } from "@/api/intraday";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { createHeartRateZoneColorMap } from "@/config/heart-rate";

import { useSelectedDay } from "../state";

import { TileWithDialog } from "./tile-with-dialog";

// Material Symbols heart icon
const HEART_ICON = (
  <svg
    role="presentation"
    xmlns="http://www.w3.org/2000/svg"
    height="1em"
    viewBox="0 -960 960 960"
    width="1em"
    fill="#EA3323"
  >
    <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z" />
  </svg>
);

export function HeartRateTileContent() {
  const day = useSelectedDay();
  const {
    data: { intradayData, heartRateZones },
  } = useSuspenseQuery(
    buildHeartRateIntradayQuery("5min", day.startOf("day"), day.endOf("day"))
  );

  let low: number | undefined = undefined;
  let high: number | undefined = undefined;

  for (const { value } of intradayData) {
    if (!low || value < low) {
      low = value;
    }
    if (!high || value > high) {
      high = value;
    }
  }

  return (
    <TileWithDialog
      dialogComponent={HeartRateTileDialogContent}
      dialogProps={{ maxWidth: "lg", fullWidth: true }}
    >
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        className="h-full"
      >
        {intradayData.length === 0 && (
          <Stack direction="column" alignItems="center" margin={2} rowGap={1}>
            {HEART_ICON} No heart rate data
          </Stack>
        )}
        {intradayData.length > 0 && (
          <SparkLineChart
            margin={{ top: 8, bottom: 4, left: 2, right: 2 }}
            data={map(intradayData, "value")}
            yAxis={{ colorMap: createHeartRateZoneColorMap(heartRateZones) }}
            curve="monotoneX"
          />
        )}
        {low && high && (
          <Typography
            padding={1}
            component="div"
            className="flex flex-row items-center gap-x-2"
          >
            {HEART_ICON}
            <div aria-label="bpm range">
              {FRACTION_DIGITS_0.format(low)} &ndash;{" "}
              {FRACTION_DIGITS_0.format(high)}
            </div>
          </Typography>
        )}
      </Stack>
    </TileWithDialog>
  );
}

function HeartRateTileDialogContent() {
  return (
    <>
      <DialogTitle>Heart rate</DialogTitle>
      <DialogContent>
        <HeartRateIntraday />
      </DialogContent>
    </>
  );
}

function HeartRateIntraday() {
  const day = useSelectedDay();
  const startTime = day.startOf("day");
  const endTime = day.endOf("day");

  const { data: { intradayData = undefined, heartRateZones } = {} } =
    useSuspenseQuery(buildHeartRateIntradayQuery("1min", startTime, endTime));

  return (
    <LineChart
      margin={{ top: 50 }}
      grid={{ horizontal: true }}
      height={300}
      loading={!intradayData}
      dataset={intradayData ?? []}
      xAxis={[{ dataKey: "dateTime", scaleType: "time" }]}
      yAxis={[
        {
          label: "BPM",
          colorMap:
            heartRateZones && createHeartRateZoneColorMap(heartRateZones),
        },
      ]}
      series={[
        {
          dataKey: "value",
          showMark: false,
          valueFormatter: (value) => `${value} BPM`,
        },
      ]}
    >
      <PiecewiseColorLegend
        axisDirection="y"
        position={{
          horizontal: "middle",
          vertical: "top",
        }}
        direction="row"
      />
    </LineChart>
  );
}
