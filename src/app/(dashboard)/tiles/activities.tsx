import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { atom, useAtom, useSetAtom } from "jotai";
import React, { Suspense } from "react";
import { Info, ViewTimeline } from "@mui/icons-material";
import Link from "next/link";

import { DailySummaryActivityLog } from "@/api/activity";
import { TIME } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import { FRACTION_DIGITS_0, FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { ACTIVITY_ICONS } from "@/config/common-ids";
import { ActivityLogDetailsDialog } from "@/app/history/activities/details";

import { useDailySummary } from "./common";
import { useTileScale } from "./tile";
import { IconWithDialog, RenderDialogContentProps } from "./tile-with-dialog";

const showingLogIdAtom = atom<number | null>(null);

export default function ActivitiesTileContent() {
  const { h } = useTileScale();
  const { activities } = useDailySummary();
  const [showingLogId, setShowingLogId] = useAtom(showingLogIdAtom);

  return (
    <Stack direction="column" alignItems="center" className="h-full">
      <Stack
        direction="row"
        className="w-full"
        alignItems="center"
        justifyContent="center"
        paddingInline={2}
        marginBlock={h > 1 ? 2 : 1}
      >
        <Typography
          variant={h > 1 ? "h6" : "body1"}
          flex={1}
          textAlign="center"
        >
          Activities
        </Typography>
        <IconWithDialog
          size="small"
          dialogComponent={ActivitiesTileDialogContent}
          dialogProps={{ maxWidth: "md", fullWidth: true }}
        >
          <Info />
        </IconWithDialog>
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
      {showingLogId && (
        <Suspense>
          <ActivityLogDetailsDialog
            logId={showingLogId}
            open={!!showingLogId}
            onClose={() => setShowingLogId(null)}
          />
        </Suspense>
      )}
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
  const setShowingLogId = useSetAtom(showingLogIdAtom);

  const icon = ACTIVITY_ICONS[activityId];
  const avatar = icon ? React.createElement(icon) : <ViewTimeline />;
  const time = TIME.format(new Date(`${startDate}T${startTime}`));

  return (
    <ListItem disablePadding className="w-full" dense={h < 2}>
      <ListItemButton onClick={() => setShowingLogId(logId)}>
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

function ActivitiesTileDialogContent({
  closeButton,
}: RenderDialogContentProps) {
  return (
    <>
      <DialogTitle>Activities</DialogTitle>
      <DialogContent>No settings yet.</DialogContent>
      <DialogActions>
        {closeButton}
        <Button LinkComponent={Link} href="/history/activities">
          View all activities
        </Button>
      </DialogActions>
    </>
  );
}
