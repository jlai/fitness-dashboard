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
  BookmarkBorder as SaveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { useState } from "react";

import { TimeSeriesChart } from "@/components/charts/timeseries-graph";
import {
  CHART_RESOURCE_CONFIGS,
  CHART_RESOURCE_MENU_ITEMS,
  ChartResource,
} from "@/components/charts/timeseries/resources";
import { SHORT_WEEKDAY } from "@/utils/date-formats";

import { useSelectedDay } from "../state";

import { useTileScale, useTileSettings } from "./tile";

interface GraphTileSettings {
  chartResource: ChartResource;
}

export default function GraphTileContent() {
  const { h } = useTileScale();
  const [settings, saveSettings] = useTileSettings<GraphTileSettings>({
    chartResource: "steps",
  });
  const [resource, setResource] = useState<ChartResource>(
    settings.chartResource
  );
  const [statsEl, setStatsEl] = useState<HTMLElement | null>(null);

  const popupState = usePopupState({
    variant: "popover",
    popupId: "graph-tile-settings",
  });
  const day = useSelectedDay();

  const startDay = day.subtract(6, "days");
  const endDay = day;

  const saveDefault = () => {
    saveSettings({
      chartResource: resource,
    });
    popupState.close();
  };

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
              <Divider />
              {CHART_RESOURCE_MENU_ITEMS.map((id, i) =>
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
        />
      </div>
    </div>
  );
}
