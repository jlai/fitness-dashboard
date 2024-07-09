"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AxisConfig,
  ChartsXAxisProps,
  LineChart,
  ScaleName,
} from "@mui/x-charts";
import { useEffect, useMemo, useState } from "react";
import { Button, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import { Download } from "@mui/icons-material";

import { buildActivityTcxQuery } from "@/api/activity/activities";
import { Trackpoint, parseTcx } from "@/api/activity/tcx";
import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ActivityLog } from "@/api/activity";
import { MAPLIBRE_STYLE_URL } from "@/config";

const LazyActivityMap = dynamic(() => import("@/components/activity-map"));

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

type LocalizedTrackpoint = {
  time: Date;
  altitudeLocalized: number;
};

const XAXIS_CONFIG: AxisConfig<ScaleName, Date, ChartsXAxisProps> = {
  id: "x",
  dataKey: "time",
  scaleType: "time",
  valueFormatter: (time: Date) => TIME_FORMAT.format(time),
};

function HeartRateChart({ trackpoints }: { trackpoints: Array<Trackpoint> }) {
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

function ElevationChart({
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

function useObjectUrl(object: File | Blob | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!object) {
      return;
    }

    const url = URL.createObjectURL(object);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [object, setObjectUrl]);

  return objectUrl;
}

export function ActivityDetails({ activityLog }: { activityLog: ActivityLog }) {
  const units = useUnits();

  const { data: tcxString } = useQuery(
    buildActivityTcxQuery(activityLog.logId)
  );

  const parsedTcx = useMemo(
    () => (tcxString ? parseTcx(tcxString) : undefined),
    [tcxString]
  );

  const tcxFilename = `${activityLog.logId}.tcx`;

  const tcxFile = useMemo(() => {
    return tcxString
      ? new File([tcxString], tcxFilename, {
          type: "application/vnd.garmin.tcx+xml",
        })
      : null;
  }, [tcxString, tcxFilename]);

  const tcxDownloadUrl = useObjectUrl(tcxFile);

  const { hasElevation, hasHeartRate, hasLocation, localizedTrackpoints } =
    useMemo(() => {
      let hasElevation = false,
        hasHeartRate = false,
        hasLocation = false;

      const localizedTrackpoints: Array<LocalizedTrackpoint> = [];

      for (const trackpoint of parsedTcx?.trackpoints ?? []) {
        if (trackpoint.altitudeMeters !== undefined) {
          hasElevation = true;

          localizedTrackpoints.push({
            time: trackpoint.time,
            altitudeLocalized: units.localizedMeters(trackpoint.altitudeMeters),
          });
        }

        if (trackpoint.heartBpm !== undefined) {
          hasHeartRate = true;
        }

        if (trackpoint.latitudeDegrees !== undefined) {
          hasLocation = true;
        }
      }

      return { hasElevation, hasHeartRate, hasLocation, localizedTrackpoints };
    }, [parsedTcx, units]);

  return (
    <div className="space-y-8">
      {activityLog && (
        <div className="flex flex-row gap-x-8">
          <Typography variant="h5">{activityLog.activityName}</Typography>
          <div className="flex-1"></div>
          {activityLog.distance && (
            <Typography variant="h5">
              {FRACTION_DIGITS_1.format(
                units.localizedKilometers(activityLog.distance)
              )}{" "}
              {units.localizedKilometersName}
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
          <Button
            disabled={!tcxDownloadUrl}
            href={tcxDownloadUrl ?? ""}
            download={tcxFilename}
          >
            <Download />
            TCX
          </Button>
        </div>
      )}

      {parsedTcx && (
        <>
          {MAPLIBRE_STYLE_URL && hasLocation && (
            <div className="w-full h-[300px]">
              <LazyActivityMap geojson={parsedTcx.geojson} />
            </div>
          )}
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
        </>
      )}
    </div>
  );
}
