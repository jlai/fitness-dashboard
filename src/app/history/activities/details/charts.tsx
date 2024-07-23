import {
  AxisConfig,
  ScaleName,
  ChartsXAxisProps,
  ResponsiveChartContainer,
  LinePlot,
  useDrawingArea,
  useXScale,
  ChartsAxisHighlightPath,
  ChartsXAxis,
  ChartsYAxis,
  ChartsClipPath,
  ChartsTooltip,
  ChartsGrid,
} from "@mui/x-charts";
import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChartsOverlay } from "@mui/x-charts/ChartsOverlay";
import {
  ComponentPropsWithoutRef,
  RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { useAtom, useAtomValue } from "jotai";
import { ScaleLinear } from "d3-scale";
import { AxisValueFormatterContext } from "@mui/x-charts/internals";

import { ParsedTcx, Trackpoint } from "@/api/activity/tcx";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { useUnits } from "@/config/units";
import { ActivityLog } from "@/api/activity";
import { buildActivityIntradayQuery, IntradayEntry } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";

import { useTrackpoints } from "./load-tcx";
import { highlightedXAtom, xScaleMeasureAtom } from "./atoms";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const TIME_FORMAT_WITH_SECONDS = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

function formatTime(value: Date, context: AxisValueFormatterContext) {
  if (isNaN(value.getDate())) {
    return "";
  }

  return context.location === "tick"
    ? TIME_FORMAT.format(value)
    : TIME_FORMAT_WITH_SECONDS.format(value);
}

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

  const startTime = dayjs(activityLog.startTime).startOf("minute");
  const endTime = startTime
    .add(activityLog.duration)
    .startOf("minute")
    .add(1, "minute");

  const { data: caloriesIntraday } = useQuery({
    ...buildActivityIntradayQuery("calories", "1min", startTime, endTime),
    enabled: ENABLE_INTRADAY,
  });

  const dateDomain: [Date, Date] = [startTime.toDate(), endTime.toDate()];

  return (
    <div className="p-4 h-full overflow-y-auto">
      {hasElevation && (
        <section>
          <Typography variant="h5">Elevation</Typography>
          <ElevationChart
            trackpoints={localizedTrackpoints}
            localizedMetersName={units.localizedMetersName}
            dateDomain={dateDomain}
          />
        </section>
      )}
      {hasHeartRate && (
        <section>
          <Typography variant="h5">Heart rate</Typography>
          <HeartRateChart
            trackpoints={parsedTcx.trackpoints}
            dateDomain={dateDomain}
          />
        </section>
      )}
      {ENABLE_INTRADAY && (
        <section>
          <Typography variant="h5">Calories burned</Typography>
          <CaloriesChart data={caloriesIntraday} dateDomain={dateDomain} />
        </section>
      )}
    </div>
  );
}

function SynchronizedHighlight({
  svgRef,
}: {
  svgRef: RefObject<SVGSVGElement>;
}) {
  const xScaleMeasure = useAtomValue(xScaleMeasureAtom);
  const [highlightedX, setHighlightedX] = useAtom(highlightedXAtom);
  const highlightRef = useRef<SVGPathElement>(null);

  const { left, top, width, height } = useDrawingArea();
  const xScale = useXScale() as ScaleLinear<any, any>;

  useEffect(() => {
    const element = svgRef.current;
    if (element === null) {
      return () => {};
    }

    const handleMouseOut = () => {
      setHighlightedX(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const x = event.offsetX;
      const y = event.offsetY;
      if (y < top || y > top + height) {
        setHighlightedX(null);
        return;
      }
      if (x < left - 10 || x > left + width + 10) {
        // Allows some margin if slightly on top/bottom of the drawing area
        setHighlightedX(null);
        return;
      }

      if (xScaleMeasure === "time") {
        setHighlightedX({
          type: "time",
          value: xScale.invert(x) as unknown as Date,
        });
      } else {
        setHighlightedX({ type: "distance", value: xScale.invert(x) });
      }
    };

    element.addEventListener("mouseout", handleMouseOut);
    element.addEventListener("mousemove", handleMouseMove);

    return () => {
      element.removeEventListener("mouseout", handleMouseOut);
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, [
    height,
    left,
    setHighlightedX,
    svgRef,
    top,
    width,
    xScale,
    xScaleMeasure,
  ]);

  const x = xScale(highlightedX?.value ?? 0);

  return (
    <ChartsAxisHighlightPath
      ref={highlightRef}
      sx={{ visibility: x ? "visible" : "hidden" }}
      d={`M ${x ?? 0} ${top} L ${x ?? 0} ${top + height}`}
      ownerState={{ axisHighlight: "line" }}
    />
  );
}

type SynchronizedChartProps = ComponentPropsWithoutRef<
  typeof ResponsiveChartContainer
> & {
  loading?: boolean;
  dateDomain?: [Date, Date];
};

export function SynchronizedChart(props: SynchronizedChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clipPathId = useId();
  const units = useUnits();

  const xScaleMeasure = useAtomValue(xScaleMeasureAtom);

  const XAXIS_CONFIG: AxisConfig<ScaleName, any, ChartsXAxisProps> =
    xScaleMeasure === "time"
      ? {
          id: "x",
          dataKey: "dateTime",
          scaleType: "time",
          min: props.dateDomain?.[0],
          max: props.dateDomain?.[1],
          valueFormatter: formatTime,
        }
      : {
          id: "x",
          dataKey: "distanceMeters",
          scaleType: "linear",
          valueFormatter: (value: number) => `${units.localizedMeters(value)}`,
        };

  return (
    <ResponsiveChartContainer
      ref={svgRef}
      height={200}
      xAxis={[XAXIS_CONFIG]}
      yAxis={[
        {
          scaleType: "linear",
        },
      ]}
      {...props}
    >
      <ChartsOverlay loading={props.loading} />
      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsGrid horizontal />
      <g clipPath={clipPathId}>
        <LinePlot />
        <SynchronizedHighlight svgRef={svgRef} />
      </g>
      <ChartsClipPath id={clipPathId} />
      <ChartsTooltip />
    </ResponsiveChartContainer>
  );
}

export function CaloriesChart({
  data,
  dateDomain,
}: {
  data?: Array<IntradayEntry>;
  dateDomain?: [Date, Date];
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_1.format(value)} Cal/min` : "";

  return (
    <SynchronizedChart
      loading={!data}
      dateDomain={dateDomain}
      dataset={data ?? []}
      series={[
        { type: "line", dataKey: "value", showMark: false, valueFormatter },
      ]}
    />
  );
}

export function HeartRateChart({
  trackpoints,
  dateDomain,
}: {
  trackpoints: Array<Trackpoint>;
  dateDomain?: [Date, Date];
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_0.format(value)} bpm` : "";

  return (
    <SynchronizedChart
      loading={!trackpoints}
      dateDomain={dateDomain}
      dataset={trackpoints}
      yAxis={[
        {
          scaleType: "linear",
        },
      ]}
      series={[
        { type: "line", dataKey: "heartBpm", showMark: false, valueFormatter },
      ]}
    />
  );
}

export function ElevationChart({
  trackpoints,
  localizedMetersName,
  dateDomain,
}: {
  trackpoints: Array<Trackpoint>;
  localizedMetersName: string;
  dateDomain?: [Date, Date];
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${FRACTION_DIGITS_0.format(value)} ${localizedMetersName}` : "";

  return (
    <SynchronizedChart
      loading={!trackpoints}
      dateDomain={dateDomain}
      dataset={trackpoints}
      yAxis={[
        {
          valueFormatter,
        },
      ]}
      series={[
        {
          type: "line",
          dataKey: "altitudeLocalized",
          showMark: false,
          valueFormatter,
        },
      ]}
    />
  );
}
