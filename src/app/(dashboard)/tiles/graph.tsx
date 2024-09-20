import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import {
  Check,
  BookmarkBorder as SaveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { useState } from "react";
import { useAtomValue } from "jotai";

import { TimeSeriesChart } from "@/components/charts/timeseries-graph";
import {
  ADVANCED_CHART_RESOURCE_MENU_ITEMS,
  CHART_RESOURCE_CONFIGS,
  CHART_RESOURCE_MENU_ITEMS,
  ChartResource,
} from "@/components/charts/timeseries/resources";
import { SHORT_WEEKDAY } from "@/utils/date-formats";
import { enableAdvancedScopesAtom } from "@/storage/settings";

import { useSelectedDay } from "../state";

import { useTileScale, useTileSettings } from "./tile";

interface GraphTileSettings {
  chartResource: ChartResource;
  showGoals?: boolean;
}

export default function GraphTileContent() {
  const { w, h } = useTileScale();
  const [settings, saveSettings] = useTileSettings<GraphTileSettings>({
    chartResource: "steps",
    showGoals: true,
  });
  const [resource, setResource] = useState<ChartResource>(
    settings.chartResource
  );
  const enableAdvancedScopes = useAtomValue(enableAdvancedScopesAtom);
  const [statsEl, setStatsEl] = useState<HTMLElement | null>(null);

  const canFitGoals = w > 1 && h > 1;

  const popupState = usePopupState({
    variant: "popover",
    popupId: "graph-tile-settings",
  });
  const day = useSelectedDay();

  const startDay = day.subtract(6, "days");
  const endDay = day;

  const saveDefault = () => {
    saveSettings({
      ...settings,
      chartResource: resource,
    });
    popupState.close();
  };

  const toggleShowGoals = () => {
    saveSettings({
      ...settings,
      showGoals: !settings.showGoals,
    });
    popupState.close();
  };

  const resourceMenuItems = enableAdvancedScopes
    ? [...CHART_RESOURCE_MENU_ITEMS, "-", ...ADVANCED_CHART_RESOURCE_MENU_ITEMS]
    : CHART_RESOURCE_MENU_ITEMS;

  return (
    <div className="size-full max-h-full relative overflow-hidden p-2">
      <div className="size-full flex flex-col">
        <div className="flex flex-row items-center">
          <Typography variant="h6" className="flex-1 text-center">
            {CHART_RESOURCE_CONFIGS[resource].label}
          </Typography>
          <div>
            <IconButton onClick={popupState.open} aria-label="open graph menu">
              <SettingsIcon />
            </IconButton>
            <Popover
              {...bindPopover(popupState)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={saveDefault}
                disabled={settings.chartResource === resource}
              >
                <ListItemIcon>
                  <SaveIcon />
                </ListItemIcon>
                <ListItemText>Save as default</ListItemText>
              </MenuItem>
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
                      popupState.close();
                    }}
                  >
                    {CHART_RESOURCE_CONFIGS[id].label}
                  </MenuItem>
                )
              )}
            </Popover>
          </div>
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
          range={{ startDay, endDay }}
          formatDate={SHORT_WEEKDAY.format}
          statsEl={statsEl ?? undefined}
          showGoals={canFitGoals && settings.showGoals}
        />
      </div>
    </div>
  );
}
