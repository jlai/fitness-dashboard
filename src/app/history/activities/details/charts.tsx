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
import { Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChartsOverlay } from "@mui/x-charts/ChartsOverlay";
import {
  ComponentPropsWithoutRef,
  RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import { useAtom, useAtomValue } from "jotai";
import { ScaleLinear } from "d3-scale";
import { AxisValueFormatterContext } from "@mui/x-charts/internals";

import { ParsedTcx, Trackpoint } from "@/api/activity/tcx";
import { NumberFormats } from "@/utils/number-formats";
import { useUnits } from "@/config/units";
import { ActivityLog } from "@/api/activity";
import {
  buildActivityIntradayQuery,
  buildHeartRateIntradayQuery,
} from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import {
  augmentWithDistances,
  DistanceScale,
  SplitDatum,
} from "@/utils/distances";
import { FlexSpacer } from "@/components/layout/flex";
import { createHeartRateZoneColorMap } from "@/config/heart-rate";
import { ParsedHeartRateZones, parseHeartRateZones } from "@/api/heart-rate";

import { useTrackpoints } from "./load-tcx";
import { highlightedXAtom, xScaleMeasureAtom } from "./atoms";
import { SplitsChart } from "./splits";

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
  distanceScale,
  splits,
}: {
  parsedTcx: ParsedTcx;
  activityLog: ActivityLog;
  distanceScale: DistanceScale;
  splits: Array<SplitDatum>;
}) {
  const { localizedKilometers, localizedMeters, localizedMetersName } =
    useUnits();
  const {
    hasElevation,
    hasHeartRate: hasTrackedHeartRate,
    localizedTrackpoints,
  } = useTrackpoints(parsedTcx);

  const startTime = dayjs(activityLog.startTime).startOf("minute");
  const endTime = startTime
    .add(activityLog.duration)
    .startOf("minute")
    .add(1, "minute");

  const { data: caloriesIntradayRaw } = useQuery({
    ...buildActivityIntradayQuery("calories", "1min", startTime, endTime),
    enabled: ENABLE_INTRADAY,
  });

  const { data: heartRateIntradayResponse } = useQuery({
    ...buildHeartRateIntradayQuery("1min", startTime, endTime),
    enabled: ENABLE_INTRADAY && !hasTrackedHeartRate,
  });

  const caloriesIntraday = useMemo(
    () =>
      caloriesIntradayRaw
        ? augmentWithDistances(
            caloriesIntradayRaw,
            distanceScale,
            localizedKilometers
          )
        : undefined,
    [caloriesIntradayRaw, distanceScale, localizedKilometers]
  );

  const heartIntraday = useMemo(() => {
    // Use TCX heartrate if available
    if (localizedTrackpoints && hasTrackedHeartRate) {
      return localizedTrackpoints.map((trackpoint) => ({
        dateTime: trackpoint.dateTime,
        value: trackpoint.heartBpm,
        distanceMeters: trackpoint.distanceMeters,
        distanceLocalized: trackpoint.distanceLocalized,
      }));
    }

    return heartRateIntradayResponse
      ? augmentWithDistances(
          heartRateIntradayResponse.intradayData,
          distanceScale,
          localizedKilometers
        )
      : undefined;
  }, [
    heartRateIntradayResponse,
    distanceScale,
    localizedKilometers,
    localizedTrackpoints,
    hasTrackedHeartRate,
  ]);

  const dateDomain: [Date, Date] = [startTime.toDate(), endTime.toDate()];

  const { averageHeartRate, heartRateZones, elevationGain } = activityLog;

  return (
    <div className="p-4 h-full">
      {hasElevation && (
        <section>
          <ChartSectionHeader title="Elevation">
            {elevationGain > 0 && (
              <Typography variant="h6">
                {NumberFormats.FRACTION_DIGITS_0.format(
                  localizedMeters(elevationGain)
                )}{" "}
                {localizedMetersName}
              </Typography>
            )}
          </ChartSectionHeader>
          <ElevationChart
            trackpoints={localizedTrackpoints}
            localizedMetersName={localizedMetersName}
            dateDomain={dateDomain}
          />
        </section>
      )}
      {(hasTrackedHeartRate || averageHeartRate) && (
        <section>
          <Typography variant="h5">Heart rate</Typography>
          <HeartRateChart
            data={heartIntraday}
            dateDomain={dateDomain}
            heartRateZones={parseHeartRateZones(heartRateZones)}
          />
        </section>
      )}
      {ENABLE_INTRADAY && (
        <section>
          <ChartSectionHeader title="Calories burned" />
          <CaloriesChart data={caloriesIntraday} dateDomain={dateDomain} />
        </section>
      )}
      {splits && splits.length > 0 && (
        <section>
          <Typography variant="h5">Splits</Typography>
          <SplitsChart splits={splits} />
        </section>
      )}
    </div>
  );
}

function ChartSectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Stack direction="row">
      <Typography variant="h5">{title}</Typography>
      <FlexSpacer />
      {children}
    </Stack>
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

export function SynchronizedChart({
  dateDomain,
  loading,
  ...chartProps
}: SynchronizedChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clipPathId = useId();
  const { localizedKilometersName } = useUnits();

  const xScaleMeasure = useAtomValue(xScaleMeasureAtom);

  const XAXIS_CONFIG: AxisConfig<ScaleName, any, ChartsXAxisProps> =
    xScaleMeasure === "time"
      ? {
          id: "x",
          dataKey: "dateTime",
          scaleType: "time",
          min: dateDomain?.[0],
          max: dateDomain?.[1],
          valueFormatter: formatTime,
        }
      : {
          id: "x",
          label: localizedKilometersName,
          dataKey: "distanceLocalized",
          scaleType: "linear",
          valueFormatter: (value: number, context) =>
            `${NumberFormats.FRACTION_DIGITS_1.format(value)} ${
              context.location === "tooltip" ? localizedKilometersName : ""
            }`,
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
      {...chartProps}
      sx={{ "&&": { touchAction: "pan-y" } }}
    >
      <ChartsOverlay loading={loading} />
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

type IntradayEntryWithDistance = {
  dateTime: Date;
  value: number | undefined;
  distanceLocalized: number | undefined;
};

export function CaloriesChart({
  data,
  dateDomain,
}: {
  data?: Array<IntradayEntryWithDistance>;
  dateDomain?: [Date, Date];
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${NumberFormats.FRACTION_DIGITS_1.format(value)} Cal/min` : "";

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
  data,
  heartRateZones,
  dateDomain,
}: {
  data?: Array<IntradayEntryWithDistance>;
  heartRateZones?: ParsedHeartRateZones;
  dateDomain?: [Date, Date];
}) {
  const valueFormatter = (value: number | null) =>
    value ? `${NumberFormats.FRACTION_DIGITS_0.format(value)} bpm` : "";

  return (
    <SynchronizedChart
      loading={!data}
      dateDomain={dateDomain}
      dataset={data ?? []}
      yAxis={[
        {
          scaleType: "linear",
          colorMap:
            heartRateZones && createHeartRateZoneColorMap(heartRateZones),
        },
      ]}
      series={[
        { type: "line", dataKey: "value", showMark: false, valueFormatter },
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
    value
      ? `${NumberFormats.FRACTION_DIGITS_0.format(
          value
        )} ${localizedMetersName}`
      : "";

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
