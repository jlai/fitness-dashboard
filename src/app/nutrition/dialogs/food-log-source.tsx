import { IconButton, Popover, Toolbar, Typography } from "@mui/material";
import { Sdk as ThirdPartyIcon } from "@material-symbols-svg/react/icons/sdk";
import { DevicesWearables as WearableIcon } from "@material-symbols-svg/react/icons/devices-wearables";
import dayjs from "dayjs";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";

import { isDataPointFromThisApp } from "@/api/datapoints";
import { NutritionLogDataPoint } from "@/api/nutrition";
import { GridView as AppIcon } from "@material-symbols-svg/react/icons/grid-view";
import { WEBSITE_NAME } from "@/config";

type LogSource = "app" | "google-health" | "third-party";

function getLogSource(foodLog: NutritionLogDataPoint): LogSource {
  if (isDataPointFromThisApp(foodLog)) {
    return "app";
  }
  return foodLog.dataSource?.platform === "FITBIT"
    ? "google-health"
    : "third-party";
}

/** Known 3rd party Google OAuth client ids and their app names. */
export const THIRD_PARTY_CLIENT_NAMES: Record<string, string> = {
  "459251996933-kd0gke900dnof1tt22gkebch5u5q6i70.apps.googleusercontent.com":
    "MyFitnessPal",
};

function describeSource(foodLog: NutritionLogDataPoint): string {
  const source = getLogSource(foodLog);
  if (source === "app") return `Logged from ${WEBSITE_NAME}`;
  if (source === "google-health") return "Logged from Google Health";

  const clientId = foodLog.dataSource?.application?.googleWebClientId;
  const appName = clientId ? THIRD_PARTY_CLIENT_NAMES[clientId] : undefined;
  return `Logged from ${appName ?? "a 3rd party app"}`;
}

function SourceIcon({ source }: { source: LogSource }) {
  switch (source) {
    case "app":
      return <AppIcon />;
    case "google-health":
      return <WearableIcon />;
    default:
      return <ThirdPartyIcon />;
  }
}

export function FoodLogSourceButton({
  foodLog,
}: {
  foodLog: NutritionLogDataPoint;
}) {
  const popupState = usePopupState({
    variant: "popover",
    popupId: "food-log-source-popup",
  });
  const source = getLogSource(foodLog);
  const startTime = foodLog.nutritionLog.interval?.startTime;

  return (
    <>
      <Toolbar
        className={`${popupState.isOpen ? "visible" : "invisible group-hover:visible"} p-1 max-h-3 min-h-2`}
      >
        <IconButton
          size="small"
          className="text-slate-500"
          title="Log details"
          onClick={popupState.open}
        >
          <SourceIcon source={source} />
        </IconButton>
      </Toolbar>
      <Popover
        {...bindPopover(popupState)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div className="p-3 max-w-xs">
          <Typography variant="subtitle1">
            {foodLog.nutritionLog.foodDisplayName}
          </Typography>
          {startTime && (
            <Typography variant="body2">
              {dayjs(startTime).format("dddd, MMMM D, YYYY [at] h:mm A")}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {describeSource(foodLog)}
          </Typography>
        </div>
      </Popover>
    </>
  );
}
