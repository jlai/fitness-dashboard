import {
  Button,
  Dialog,
  DialogContent,
  InputAdornment,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "mui-sonner";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import {
  DatePickerElement,
  TimePickerElement,
} from "react-hook-form-mui/date-pickers";

import { buildCreateActivityLogMutation } from "@/api/activity/activities";
import { useUnits } from "@/config/units";

import { ActivityTypeElement, ActivityTypeOption } from "./activity-type-input";

export const createActivityLogDialogOpenAtom = atom(false);

interface CreateActivityFormData {
  activityType: ActivityTypeOption | null;
  startTime: Dayjs;
  durationMinutes: number;
  distance?: number;
  distanceUnit?: string;
  manualCalories?: number;
}

function validateStartTime(value: Dayjs, formValues: CreateActivityFormData) {
  const endsAfterNow = value
    .add(formValues.durationMinutes, "minutes")
    .isAfter(dayjs());

  if (endsAfterNow) {
    return "Activity duration ends in the future";
  }
}

function CreateActivityLog({ onSaveSuccess }: { onSaveSuccess?: () => void }) {
  const units = useUnits();

  const formContext = useForm<CreateActivityFormData>({
    defaultValues: {
      activityType: null,
      startTime: dayjs().subtract(30, "minutes"),
      durationMinutes: 30,
      distanceUnit: units.distanceUnit,
    },
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();

  const { mutateAsync: createActivityLog } = useMutation(
    buildCreateActivityLogMutation(queryClient)
  );

  const onSubmit = useCallback(
    (values: CreateActivityFormData) => {
      createActivityLog({
        activityId: values.activityType!.id,
        startTime: values.startTime,
        durationMinutes: values.durationMinutes,
        distance: values.distance,
        distanceUnit: values.distanceUnit,
        manualCalories: values.manualCalories,
      }).then(
        () => {
          toast.success("Logged activity");
          onSaveSuccess?.();
        },
        () => {
          toast.error("Error logging activity");
        }
      );
    },
    [createActivityLog, onSaveSuccess]
  );

  const distanceIsRequired = watch("activityType")?.requiresDistance;

  return (
    <FormContainer<CreateActivityFormData>
      onSuccess={onSubmit}
      formContext={formContext}
    >
      <Typography variant="h4" className="mb-8 text-center">
        Log activity
      </Typography>
      <div className="flex flex-col gap-y-8">
        <ActivityTypeElement name="activityType" rules={{ required: true }} />
        <DatePickerElement
          name="startTime"
          label="Day"
          disableFuture
          rules={{ validate: { startTime: validateStartTime } }}
        />
        <TimePickerElement
          name="startTime"
          label="Time"
          disableFuture
          rules={{ validate: { startTime: validateStartTime } }}
        />
        <TextFieldElement
          name="durationMinutes"
          type="number"
          label="Duration"
          autoComplete="off"
          rules={{ min: 1 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">mins</InputAdornment>,
          }}
        />
        <TextFieldElement
          type="number"
          name="distance"
          label="Distance"
          autoComplete="off"
          rules={{ required: distanceIsRequired }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {units.localizedKilometersName}
              </InputAdornment>
            ),
          }}
        />
        <TextFieldElement
          name="manualCalories"
          type="number"
          label="Calories"
          autoComplete="off"
          rules={{ min: 1 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">cal</InputAdornment>,
          }}
        />
      </div>
      <div className="flex flex-row items-center justify-end mt-4">
        <Button type="submit" disabled={!watch("activityType")}>
          Save
        </Button>
      </div>
    </FormContainer>
  );
}

export default function CreateActivityLogDialog() {
  const [isOpen, setIsOpen] = useAtom(createActivityLogDialogOpenAtom);

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
      <DialogContent>
        <CreateActivityLog onSaveSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
