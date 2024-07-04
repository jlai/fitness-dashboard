"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AxisConfig,
  ChartsXAxisProps,
  LineChart,
  ScaleName,
} from "@mui/x-charts";
import { useMemo } from "react";
import { Typography } from "@mui/material";

import { getActivityTcxQuery } from "@/api/activity/activities";
import { Trackpoint, parseTcx } from "@/api/activity/tcx";
import { useUnits } from "@/api/units";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ActivityLog } from "@/api/activity";

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

function HeartRateChart({ trackpoints }: { trackpoints: Array<Trackpoint> }) {
  return (
    <LineChart
      skipAnimation
      height={200}
      dataset={trackpoints}
      xAxis={[XAXIS_CONFIG]}
      series={[{ dataKey: "heartBpm", showMark: false }]}
    />
  );
}

function ElevationChart({ trackpoints }: { trackpoints: Array<Trackpoint> }) {
  return (
    <LineChart
      skipAnimation
      height={200}
      dataset={trackpoints}
      xAxis={[XAXIS_CONFIG]}
      series={[{ dataKey: "altitudeMeters", showMark: false }]}
    />
  );
}

export function ActivityDetails({ activityLog }: { activityLog: ActivityLog }) {
  const units = useUnits();

  const { data: tcxString } = useQuery(getActivityTcxQuery(activityLog.logId));

  const parsedTcx = useMemo(
    () => (tcxString ? parseTcx(tcxString) : undefined),
    [tcxString]
  );

  const { hasElevation, hasHeartRate } = useMemo(() => {
    let hasElevation = false,
      hasHeartRate = false;

    for (const trackpoint of parsedTcx?.trackpoints ?? []) {
      if (trackpoint.altitudeMeters !== undefined) {
        hasElevation = true;
      }

      if (trackpoint.heartBpm !== undefined) {
        hasHeartRate = true;
      }
    }

    return { hasElevation, hasHeartRate };
  }, [parsedTcx]);

  return (
    <div className="space-y-8">
      {activityLog && (
        <div className="flex flex-row gap-x-8">
          <Typography variant="h5">{activityLog.activityName}</Typography>
          <div className="flex-1"></div>
          {activityLog.distance && (
            <Typography variant="h5">
              {FRACTION_DIGITS_1.format(
                units.localizedDistance(activityLog.distance)
              )}{" "}
              {units.localizedDistanceName}
            </Typography>
          )}
          {activityLog.averageHeartRate && (
            <Typography variant="h5">
              {activityLog.averageHeartRate} bpm
            </Typography>
          )}
          {activityLog.calories && (
            <Typography variant="h5">
              {activityLog.calories} calories
            </Typography>
          )}
        </div>
      )}

      {parsedTcx && (
        <>
          {hasElevation && (
            <section>
              <Typography variant="h5" className="mb-4">
                Elevation (meters)
              </Typography>
              <ElevationChart trackpoints={parsedTcx.trackpoints} />
            </section>
          )}
          {hasHeartRate && (
            <section>
              <Typography variant="h5" className="mb-4">
                Heart rate (bpm)
              </Typography>
              <HeartRateChart trackpoints={parsedTcx.trackpoints} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
