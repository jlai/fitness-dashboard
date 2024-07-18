"use client";

import { Button, Stack, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import { Download } from "@mui/icons-material";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ActivityLog } from "@/api/activity";
import { MAPLIBRE_STYLE_URL } from "@/config";
import { HeaderBar } from "@/components/layout/rows";

import {
  useFetchTcxAsString,
  useParsedTcx,
  useTcxDownloadUrl,
  useTrackpoints,
} from "./load-tcx";
import { ElevationChart, HeartRateChart } from "./charts";

const LazyActivityMap = dynamic(() => import("@/components/activity-map"));

function ActivityOverview({
  activityLog,
  tcxString,
}: {
  activityLog: ActivityLog;
  tcxString?: string;
}) {
  const units = useUnits();

  const tcxFilename = `${activityLog.logId}.tcx`;
  const tcxDownloadUrl = useTcxDownloadUrl(tcxString, tcxFilename);

  return (
    <HeaderBar marginTop={0} marginInline={2}>
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
        <Typography variant="h5">{activityLog.averageHeartRate} bpm</Typography>
      )}
      {activityLog.calories && (
        <Typography variant="h5">{activityLog.calories} calories</Typography>
      )}
      <Button
        disabled={!tcxDownloadUrl}
        href={tcxDownloadUrl ?? ""}
        download={tcxFilename}
      >
        <Download />
        TCX
      </Button>
    </HeaderBar>
  );
}

export function ActivityDetails({ activityLog }: { activityLog: ActivityLog }) {
  const units = useUnits();
  const tcxString = useFetchTcxAsString(activityLog.logId);
  const parsedTcx = useParsedTcx(tcxString);

  const { hasElevation, hasHeartRate, hasLocation, localizedTrackpoints } =
    useTrackpoints(parsedTcx);

  return (
    <Stack direction="column" className="h-full">
      <ActivityOverview activityLog={activityLog} tcxString={tcxString} />

      {parsedTcx && (
        <PanelGroup direction="horizontal" className="h-full">
          {MAPLIBRE_STYLE_URL && hasLocation && (
            <>
              <Panel id="map" className="min-h-full">
                <div className="size-full">
                  <LazyActivityMap geojson={parsedTcx.geojson} />
                </div>
              </Panel>
              <PanelResizeHandle
                id="resize-handle"
                className="w-[2px] bg-slate-200 bg-opacity-50"
              />
            </>
          )}
          <Panel id="charts" className="p-4">
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
          </Panel>
        </PanelGroup>
      )}
    </Stack>
  );
}
