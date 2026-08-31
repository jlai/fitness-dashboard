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
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildGetExerciseByDateQuery } from "@/api/exercise/exercise";
import {
  getExerciseCalories,
  getExerciseDataPointId,
  getExerciseDisplayName,
  getExerciseDistanceKilometers,
  getExerciseFromDataPoint,
  getExerciseStartTime,
  getExerciseSteps,
  type ExerciseDataPoint,
} from "@/api/exercise/helpers";
import { DateFormats } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import { NumberFormats } from "@/utils/number-formats";
import { ACTIVITY_ICONS } from "@/config/common-ids";
import { ActivityLogDetailsDialog } from "@/app/history/activities/details";

import { useSelectedDay } from "../state";
import { useTileScale } from "./tile";
import { IconWithDialog, RenderDialogContentProps } from "./tile-with-dialog";

const showingLogIdAtom = atom<string | null>(null);

export default function ActivitiesTileContent() {
  const { h } = useTileScale();
  const selectedDay = useSelectedDay();
  const { data: activities = [] } = useSuspenseQuery(
    buildGetExerciseByDateQuery(selectedDay)
  );
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
          {activities.map((dataPoint) => (
            <ActivityLogSummary
              key={getExerciseDataPointId(dataPoint)}
              dataPoint={dataPoint}
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

function ActivityLogSummary({ dataPoint }: { dataPoint: ExerciseDataPoint }) {
  const { w, h } = useTileScale();
  const { localizedKilometers, localizedKilometersName } = useUnits();
  const exercise = getExerciseFromDataPoint(dataPoint);
  const name = getExerciseDisplayName(exercise);
  const startTime = getExerciseStartTime(exercise);
  const calories = getExerciseCalories(exercise);
  const steps = getExerciseSteps(exercise);
  const distance = getExerciseDistanceKilometers(exercise);
  const activityType = exercise.exerciseType;
  const logId = getExerciseDataPointId(dataPoint);
  const setShowingLogId = useSetAtom(showingLogIdAtom);

  const icon = activityType ? ACTIVITY_ICONS[activityType] : undefined;
  const avatar = icon ? React.createElement(icon) : <ViewTimeline />;
  const time = startTime
    ? DateFormats.TIME.format(new Date(startTime))
    : "";

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
                    {NumberFormats.FRACTION_DIGITS_1.format(
                      localizedKilometers(distance)
                    )}{" "}
                    {localizedKilometersName}
                  </>
                )}
                {!distance && steps && (
                  <>
                    {" "}
                    &bull; {NumberFormats.FRACTION_DIGITS_0.format(steps)} steps
                  </>
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
