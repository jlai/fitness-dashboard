import {
  AxisConfig,
  ScaleName,
  ChartsXAxisProps,
  LineChart,
} from "@mui/x-charts";

import { Trackpoint } from "@/api/activity/tcx";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";

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
