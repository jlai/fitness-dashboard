"use client";

import {
  Button,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import dynamic from "next/dynamic";
import { Download } from "@mui/icons-material";
import {
  Direction,
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ActivityLog } from "@/api/activity";
import { MAPLIBRE_STYLE_URL } from "@/config";
import { HeaderBar } from "@/components/layout/rows";

import {
  useFetchTcxAsString,
  useParsedTcx,
  useTcxDownloadUrl,
} from "./load-tcx";
import { ActivityTcxCharts } from "./charts";

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
  const tcxString = useFetchTcxAsString(activityLog.logId);
  const parsedTcx = useParsedTcx(tcxString);

  const theme = useTheme();
  const isSmallOrLarger = useMediaQuery(theme.breakpoints.up("sm"));

  // Auto-switch based on screen size
  const panelDirection: Direction = isSmallOrLarger ? "horizontal" : "vertical";

  return (
    <Stack direction="column" className="min-h-0 h-full flex-1">
      <ActivityOverview activityLog={activityLog} tcxString={tcxString} />

      {parsedTcx && (
        <PanelGroup direction={panelDirection} className="h-full">
          {MAPLIBRE_STYLE_URL && parsedTcx.geojson && (
            <>
              <Panel id="map" className="min-h-[20px]">
                <div className="size-full">
                  <LazyActivityMap geojson={parsedTcx.geojson} />
                </div>
              </Panel>
              {panelDirection === "vertical" ? (
                <PanelResizeHandle
                  id="resize-handle"
                  className="h-[4px] bg-slate-200 bg-opacity-50"
                />
              ) : (
                <PanelResizeHandle
                  id="resize-handle"
                  className="w-[4px] bg-slate-200 bg-opacity-50"
                />
              )}
            </>
          )}
          <Panel
            id="charts"
            className="max-h-full min-h-[20px] overflow-y-auto"
          >
            <ActivityTcxCharts
              activityLog={activityLog}
              parsedTcx={parsedTcx}
            />
          </Panel>
        </PanelGroup>
      )}
    </Stack>
  );
}
