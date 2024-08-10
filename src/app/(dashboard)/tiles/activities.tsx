import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "mui-sonner";
import React from "react";
import { ViewTimeline } from "@mui/icons-material";

import { DailySummaryActivityLog } from "@/api/activity";
import { TIME } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ACTIVITY_ICONS } from "@/config/common-ids";
import {
  ActivityLogDetailsDialog,
  showingActivityLogDetailsDialogAtom,
} from "@/app/history/activities/details";
import { buildGetActivityLogQuery } from "@/api/activity/activities";

import { useDailySummary } from "./common";
import { useTileScale } from "./tile";

export default function ActivitiesTileContent() {
  const { h } = useTileScale();
  const { activities } = useDailySummary();

  return (
    <Stack direction="column" alignItems="center" className="h-full">
      <Stack
        direction="row"
        className="w-full"
        justifyContent="center"
        marginInline={2}
        marginBlock={h > 1 ? 2 : 1}
      >
        <Typography variant={h > 1 ? "h6" : "body1"}>Activities</Typography>
      </Stack>
      {activities.length === 0 && <Typography>No activities</Typography>}
      {activities.length > 0 && (
        <List disablePadding className="w-full flex-1 overflow-y-auto">
          {activities.map((activityLog) => (
            <ActivityLogSummary
              key={activityLog.logId}
              activityLog={activityLog}
            />
          ))}
        </List>
      )}
      <ActivityLogDetailsDialog />
    </Stack>
  );
}

function ActivityLogSummary({
  activityLog,
}: {
  activityLog: DailySummaryActivityLog;
}) {
  const { w, h } = useTileScale();
  const { localizedKilometers, localizedKilometersName } = useUnits();
  const {
    name,
    startDate,
    startTime,
    calories,
    steps,
    distance,
    activityId,
    logId,
  } = activityLog;
  const showActivityLog = useSetAtom(showingActivityLogDetailsDialogAtom);
  const queryClient = useQueryClient();

  const icon = ACTIVITY_ICONS[activityId];
  const avatar = icon ? React.createElement(icon) : <ViewTimeline />;
  const time = TIME.format(new Date(`${startDate}T${startTime}`));

  const loadAndShowActivityLog = () => {
    // We have an incomplete activity log in the summary; get the full log
    queryClient
      .fetchQuery(buildGetActivityLogQuery(logId))
      .then((fullActivityLog) => {
        showActivityLog(fullActivityLog);
      })
      .catch(() => {
        toast.error("Error loading activity log");
      });
  };

  return (
    <ListItem disablePadding className="w-full" dense={h < 2}>
      <ListItemButton onClick={loadAndShowActivityLog}>
        {w > 1 && avatar && <ListItemAvatar>{avatar}</ListItemAvatar>}
        <ListItemText
          primary={
            <>
              {name}
              {w > 1 && <> &bull; {time}</>}
            </>
          }
          secondary={
            w > 1 ? (
              <>
                <>{calories} Cal</>
                {distance && (
                  <>
                    {" "}
                    &bull;{" "}
                    {FRACTION_DIGITS_1.format(
                      localizedKilometers(distance)
                    )}{" "}
                    {localizedKilometersName}
                  </>
                )}
                {!distance && steps && (
                  <> &bull; {FRACTION_DIGITS_0.format(steps)} steps</>
                )}
              </>
            ) : (
              time
            )
          }
        />
      </ListItemButton>
    </ListItem>
  );
}
