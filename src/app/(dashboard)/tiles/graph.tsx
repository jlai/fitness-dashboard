import {
  Divider,
  IconButton,
  MenuItem,
  Popover,
  Typography,
} from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { useState } from "react";

import {
  buildTimeSeriesQuery,
  TIME_SERIES_CONFIGS,
  TimeSeriesResource,
} from "@/api/activity";
import { useDataset } from "@/components/charts/dataset";
import { TimeSeriesChart } from "@/components/charts/timeseries-graph";
import { SHORT_WEEKDAY } from "@/utils/date-formats";
import {
  CHART_RESOURCE_CONFIGS,
  CHART_RESOURCE_MENU_ITEMS,
} from "@/components/charts/resources";
import { RequireScopes } from "@/components/require-scopes";

import { useSelectedDay } from "../state";

export default function GraphTileContent() {
  const [resource, setResource] = useState<TimeSeriesResource>("steps");

  const popupState = usePopupState({
    variant: "popover",
    popupId: "graph-tile-settings",
  });
  const day = useSelectedDay();

  const startDay = day.subtract(7, "days");
  const endDay = day;

  const { data } = useSuspenseQuery({
    ...buildTimeSeriesQuery(resource, startDay, endDay),
  });

  const { dataset, series, yAxis } = useDataset(resource, data);

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
        <RequireScopes scopes={TIME_SERIES_CONFIGS[resource].requiredScopes}>
          <TimeSeriesChart
            dataset={dataset}
            series={series}
            yAxis={yAxis}
            formatDate={SHORT_WEEKDAY.format}
          />
        </RequireScopes>
      </div>
    </div>
  );
}
