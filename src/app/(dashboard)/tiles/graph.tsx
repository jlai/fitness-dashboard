import {
  Divider,
  IconButton,
  MenuItem,
  Popover,
  Typography,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
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

export default function GraphTileContent() {
  const [resource, setResource] = useState<ChartResource>("steps");

  const popupState = usePopupState({
    variant: "popover",
    popupId: "graph-tile-settings",
  });
  const day = useSelectedDay();

  const startDay = day.subtract(7, "days");
  const endDay = day;

  return (
    <div className="size-full max-h-full relative overflow-hidden p-2">
      <div className="size-full flex flex-col">
        <div className="flex flex-row items-center">
          <Typography variant="h6" className="flex-1 text-center">
            {CHART_RESOURCE_CONFIGS[resource].label}
          </Typography>
          <div>
            <IconButton onClick={popupState.open}>
              <SettingsIcon />
            </IconButton>
            <Popover
              {...bindPopover(popupState)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
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
        <TimeSeriesChart
          resource={resource}
          range={{ startDay, endDay }}
          formatDate={SHORT_WEEKDAY.format}
        />
      </div>
    </div>
  );
}
