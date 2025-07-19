import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import {
  Check,
  Settings as SettingsIcon,
  BookmarkBorder as SaveIcon,
} from "@mui/icons-material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { NestedMenuItem } from "mui-nested-menu";
import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Dayjs } from "dayjs";

import { TimeSeriesChart } from "@/components/charts/timeseries-graph";
import {
  ADVANCED_CHART_RESOURCE_MENU_ITEMS,
  CHART_RESOURCE_CONFIGS,
  CHART_RESOURCE_MENU_ITEMS,
  ChartResource,
} from "@/components/charts/timeseries/resources";
import { DateFormats } from "@/utils/date-formats";
import { enableAdvancedScopesAtom } from "@/storage/settings";
import { DayjsRange } from "@/components/calendar/period-navigator";

import { useSelectedDay } from "../state";

import { useTileScale, useTileSettings } from "./tile";

type GraphPeriod = "7d" | "14d" | "current-week" | "current-month";

interface GraphPeriodOption {
  label: string;
  value: GraphPeriod;
}

const graphPeriodOptions: GraphPeriodOption[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Current week", value: "current-week" },
  { label: "Current month", value: "current-month" },
];

interface GraphTileSettings {
  chartResource: ChartResource;
  showGoals?: boolean;
  period?: GraphPeriod;
}

const DEFAULT_SETTINGS: GraphTileSettings = {
  chartResource: "steps",
  showGoals: true,
  period: "7d",
};

export function GraphSettingsMenuButton({
  resource,
  setResource,
  period,
  setPeriod,
  canFitGoals,
}: {
  resource: string;
  setResource: (resource: string) => void;
  period: GraphPeriod;
  setPeriod: (period: GraphPeriod) => void;
  canFitGoals: boolean;
}) {
  const enableAdvancedScopes = useAtomValue(enableAdvancedScopesAtom);

  const resourceMenuItems = enableAdvancedScopes
    ? [...CHART_RESOURCE_MENU_ITEMS, "-", ...ADVANCED_CHART_RESOURCE_MENU_ITEMS]
    : CHART_RESOURCE_MENU_ITEMS;

  const popupState = usePopupState({
    variant: "popover",
    popupId: "graph-tile-settings",
  });

  const [settings, saveSettings] =
    useTileSettings<GraphTileSettings>(DEFAULT_SETTINGS);

  const saveDefault = () => {
    saveSettings({
      ...settings,
      chartResource: resource,
      period,
    });
    close();
  };

  const toggleShowGoals = () => {
    saveSettings({
      ...settings,
      showGoals: !settings.showGoals,
    });
    close();
  };

  return (
    <>
      <IconButton onClick={popupState.open} aria-label="open graph menu">
        <SettingsIcon />
      </IconButton>
      <Menu
        {...bindMenu(popupState)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={saveDefault}
          disabled={
            settings.chartResource === resource && settings.period === period
          }
        >
          <ListItemIcon>
            <SaveIcon />
          </ListItemIcon>
          <ListItemText>Save as default</ListItemText>
        </MenuItem>
        <NestedMenuItem
          parentMenuOpen={popupState.isOpen}
          renderLabel={() => (
            <ListItemText sx={{ paddingInlineStart: "12px" }}>
              Time Period
            </ListItemText>
          )}
        >
          {graphPeriodOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => setPeriod(option.value)}
            >
              <ListItemIcon>
                {period === option.value ? <Check /> : undefined}
              </ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          ))}
        </NestedMenuItem>
        {canFitGoals && (
          <MenuItem onClick={toggleShowGoals}>
            <ListItemIcon aria-checked={!!settings.showGoals}>
              {settings.showGoals ? <Check /> : undefined}
            </ListItemIcon>
            <ListItemText>Show goals</ListItemText>
          </MenuItem>
        )}
        <Divider />
        {resourceMenuItems.map((id, i) =>
          id === "-" ? (
            <Divider key={i} />
          ) : (
            <MenuItem
              key={id}
              onClick={() => {
                setResource(id);
                close();
              }}
            >
              {CHART_RESOURCE_CONFIGS[id].label}
            </MenuItem>
          )
        )}
      </Menu>
    </>
  );
}

function getGraphRange(referenceDay: Dayjs, period: GraphPeriod): DayjsRange {
  switch (period) {
    case "14d":
      return {
        startDay: referenceDay.subtract(13, "days"),
        endDay: referenceDay,
      };
    case "current-week":
      return {
        startDay: referenceDay.startOf("week"),
        endDay: referenceDay,
      };
    case "current-month":
      return {
        startDay: referenceDay.startOf("month"),
        endDay: referenceDay,
      };
    default:
      return {
        startDay: referenceDay.subtract(6, "days"),
        endDay: referenceDay,
      };
  }
}

function getDateFormat(period: GraphPeriod) {
  switch (period) {
    case "14d":
    case "current-month":
      return undefined;
    default:
      return DateFormats.SHORT_WEEKDAY.format;
  }
}

export default function GraphTileContent() {
  const { w, h } = useTileScale();
  const [settings] = useTileSettings<GraphTileSettings>(DEFAULT_SETTINGS);
  const [resource, setResource] = useState<ChartResource>(
    settings.chartResource
  );
  const [period, setPeriod] = useState<GraphPeriod>(settings.period || "7d");
  const [statsEl, setStatsEl] = useState<HTMLElement | null>(null);

  const canFitGoals = w > 1 && h > 1;

  const day = useSelectedDay();
  const range = useMemo(() => getGraphRange(day, period), [day, period]);
  const dateFormat = useMemo(() => getDateFormat(period), [period]);

  return (
    <div className="size-full max-h-full relative overflow-hidden p-2">
      <div className="size-full flex flex-col">
        <div className="flex flex-row items-center">
          <Typography variant="h6" className="flex-1 text-center">
            {CHART_RESOURCE_CONFIGS[resource].label}
          </Typography>
          <GraphSettingsMenuButton
            resource={resource}
            setResource={setResource}
            period={period}
            setPeriod={setPeriod}
            canFitGoals={canFitGoals}
          />
        </div>
        <Stack
          display={h > 1 ? "flex" : "none"}
          direction="row"
          columnGap={4}
          ref={setStatsEl}
          padding={1}
          justifyContent="center"
        />
        <TimeSeriesChart
          resource={resource}
          range={range}
          formatDate={dateFormat}
          statsEl={statsEl ?? undefined}
          showGoals={canFitGoals && settings.showGoals}
        />
      </div>
    </div>
  );
}
