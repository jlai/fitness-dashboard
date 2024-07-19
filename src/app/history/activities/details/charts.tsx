import {
  AxisConfig,
  ScaleName,
  ChartsXAxisProps,
  LineChart,
} from "@mui/x-charts";
import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { ParsedTcx, Trackpoint } from "@/api/activity/tcx";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { useUnits } from "@/config/units";
import { ActivityLog } from "@/api/activity";
import { buildActivityIntradayQuery, IntradayEntry } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";

import { useTrackpoints } from "./load-tcx";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const XAXIS_CONFIG: AxisConfig<ScaleName, Date, ChartsXAxisProps> = {
  id: "x",
  dataKey: "time",
  scaleType: "time",
  valueFormatter: (time: Date) => TIME_FORMAT.format(time),
};

export function ActivityTcxCharts({
  parsedTcx,
  activityLog,
}: {
  parsedTcx: ParsedTcx;
  activityLog: ActivityLog;
}) {
  const units = useUnits();
  const { hasElevation, hasHeartRate, localizedTrackpoints } =
    useTrackpoints(parsedTcx);

  const startTime = dayjs(activityLog.startTime);
  const endTime = startTime.add(activityLog.duration);

  const { data: caloriesIntraday } = useQuery({
    ...buildActivityIntradayQuery("calories", "1min", startTime, endTime),
    enabled: ENABLE_INTRADAY,
  });

  return (
    <div className="p-4 h-full overflow-y-auto">
      {hasElevation && (
        <section>
          <Typography variant="h5">Elevation</Typography>
          <ElevationChart
            trackpoints={localizedTrackpoints}
            localizedMetersName={units.localizedMetersName}
          />
        </section>
      )}
      {hasHeartRate && (
        <section>
          <Typography variant="h5">Heart rate</Typography>
          <HeartRateChart trackpoints={parsedTcx.trackpoints} />
        </section>
      )}
      <section>
        <Typography variant="h5">Calories burned</Typography>
        <CaloriesChart data={caloriesIntraday} />
      </section>{" "}
    </div>
  );
}

export function CaloriesChart({ data }: { data?: Array<IntradayEntry> }) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_1.format(value)} Cal/min` : "";

  return (
    <LineChart
      loading={!data}
      skipAnimation
      height={200}
      dataset={data ?? []}
      xAxis={[{ ...XAXIS_CONFIG, dataKey: "dateTime" }]}
      yAxis={[
        {
          scaleType: "linear",
        },
      ]}
      series={[{ dataKey: "value", showMark: false, valueFormatter }]}
    />
  );
}

export function HeartRateChart({
  trackpoints,
}: {
  trackpoints: Array<Trackpoint>;
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_0.format(value)} bpm` : "";

  return (
    <LineChart
      skipAnimation
      height={200}
      dataset={trackpoints}
      xAxis={[XAXIS_CONFIG]}
      yAxis={[
        {
          scaleType: "linear",
        },
      ]}
      series={[{ dataKey: "heartBpm", showMark: false, valueFormatter }]}
    />
  );
}

export function ElevationChart({
  trackpoints,
  localizedMetersName,
}: {
  trackpoints: Array<Trackpoint>;
  localizedMetersName: string;
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_0.format(value)} ${localizedMetersName}` : "";

  return (
    <LineChart
      skipAnimation
      height={200}
      slotProps={{ legend: { hidden: true } }}
      dataset={trackpoints}
      xAxis={[XAXIS_CONFIG]}
      yAxis={[
        {
          valueFormatter,
        },
      ]}
      series={[
        { dataKey: "altitudeLocalized", showMark: false, valueFormatter },
      ]}
    />
  );
}
