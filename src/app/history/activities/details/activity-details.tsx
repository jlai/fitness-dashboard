"use client";

import {
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import dynamic from "next/dynamic";
import { Download } from "@mui/icons-material";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { bisector } from "d3-array";
import { useAtom, useAtomValue } from "jotai";

import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ActivityLog } from "@/api/activity";
import { MAPLIBRE_STYLE_URL } from "@/config";
import { HeaderBar } from "@/components/layout/rows";
import { ParsedTcx, Trackpoint } from "@/api/activity/tcx";
import { FlexSpacer } from "@/components/layout/flex";

import {
  useFetchTcxAsString,
  useParsedTcx,
  useTcxDownloadUrl,
} from "./load-tcx";
import { ActivityTcxCharts } from "./charts";
import { highlightedXAtom, xScaleMeasureAtom } from "./atoms";
import { trackpointsHasDistances } from "./distances";

const LazyActivityMap = dynamic(() => import("@/components/map/activity-map"));

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

function MapWithPosition({ parsedTcx }: { parsedTcx: ParsedTcx }) {
  let tracePosition: [number, number] | undefined = undefined;

  const x = useAtomValue(highlightedXAtom);

  if (x) {
    let index;

    if (x.type === "time") {
      const trackpointBisector = bisector<Trackpoint, Date>((d) => d.dateTime);
      index = trackpointBisector.center(parsedTcx.trackpoints, x.value);
    } else {
      const trackpointBisector = bisector<Trackpoint, number | undefined>(
        (d) => d.distanceMeters
      );
      index = trackpointBisector.center(parsedTcx.trackpoints, x.value);
    }

    const { longitudeDegrees, latitudeDegrees } =
      parsedTcx.trackpoints[index] ?? {};

    if (longitudeDegrees && latitudeDegrees) {
      tracePosition = [longitudeDegrees, latitudeDegrees];
    }
  }

  return (
    <LazyActivityMap
      geojson={parsedTcx.geojson!}
      tracePosition={tracePosition}
    />
  );
}

export function ActivityDetails({ activityLog }: { activityLog: ActivityLog }) {
  const tcxString = useFetchTcxAsString(activityLog.logId);
  const parsedTcx = useParsedTcx(tcxString);

  const hasDistances =
    parsedTcx && trackpointsHasDistances(parsedTcx.trackpoints);

  const theme = useTheme();
  const isSmallOrLarger = useMediaQuery(theme.breakpoints.up("sm"));

  // Auto-switch based on screen size
  const panelDirection = isSmallOrLarger ? "horizontal" : "vertical";

  return (
    <Stack direction="column" className="min-h-0 h-full flex-1">
      <ActivityOverview activityLog={activityLog} tcxString={tcxString} />

      {parsedTcx && (
        <PanelGroup direction={panelDirection} className="h-full">
          {MAPLIBRE_STYLE_URL && parsedTcx.geojson && (
            <>
              <Panel id="map" className="min-h-[20px]">
                <div className="size-full">
                  <MapWithPosition parsedTcx={parsedTcx} />
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
            <HeaderBar>
              <FlexSpacer />
              {hasDistances && <MeasureToggle />}
            </HeaderBar>
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

function MeasureToggle() {
  const [xScaleMeasure, setXScaleMeasure] = useAtom(xScaleMeasureAtom);

  const handleChange = (event: any, value: typeof xScaleMeasure) => {
    if (!value) {
      return;
    }

    setXScaleMeasure(value);
  };

  return (
    <ToggleButtonGroup
      value={xScaleMeasure}
      onChange={handleChange}
      exclusive
      size="small"
    >
      <ToggleButton value="time">Time</ToggleButton>
      <ToggleButton value="distance">Distance</ToggleButton>
    </ToggleButtonGroup>
  );
}
