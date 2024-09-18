import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "mui-sonner";
import {
  CheckboxElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import {
  DatePickerElement,
  TimePickerElement,
} from "react-hook-form-mui/date-pickers";

import {
  buildCreateActivityLogMutation,
  CreateActivityLogDistanceUnit,
} from "@/api/activity/activities";
import { useUnits } from "@/config/units";
import {
  ACTIVITY_TYPES_WITH_STEPS,
  SWIMMING_ACTIVITY_TYPE,
} from "@/config/common-ids";
import { isBeforeToday } from "@/utils/date-utils";

import { DividedStack } from "../layout/flex";

import { ActivityTypeElement, ActivityTypeOption } from "./activity-type-input";

export const createActivityLogDialogOpenAtom = atom(false);

interface CreateActivityFormData {
  activityType: ActivityTypeOption | null;
  startTime: Dayjs;
  durationMinutes: number;
  distance?: number;
  manualCalories?: number;
  useSteps?: boolean;
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
  const {
    distanceUnit: distanceUnitSystem,
    swimUnit: swimUnitSystem,
    localizedKilometersName,
    localizedSwimMetersName,
  } = useUnits();

  const formContext = useForm<CreateActivityFormData>({
    defaultValues: {
      activityType: null,
      startTime: dayjs().subtract(30, "minutes"),
      durationMinutes: 30,
      useSteps: false,
    },
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();

  const { mutateAsync: createActivityLog } = useMutation(
    buildCreateActivityLogMutation(queryClient)
  );

  const distanceIsRequired = watch("activityType")?.requiresDistance;
  const supportsSteps = ACTIVITY_TYPES_WITH_STEPS.has(
    watch("activityType")?.id ?? -1
  );
  const isSwimming = watch("activityType")?.id === SWIMMING_ACTIVITY_TYPE;
  const useSteps = supportsSteps && watch("useSteps");

  const onSubmit = useCallback(
    (values: CreateActivityFormData) => {
      let unit: CreateActivityLogDistanceUnit =
        distanceUnitSystem === "en_US" ? "mile" : "kilometer";

      if (supportsSteps && values.useSteps) {
        unit = "steps";
      } else if (isSwimming) {
        unit = swimUnitSystem === "en_US" ? "yards" : "meter";
      }

      createActivityLog({
        activityId: values.activityType!.id,
        startTime: values.startTime,
        durationMinutes: values.durationMinutes,
        distance: values.distance,
        distanceUnit: unit,
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
    [
      createActivityLog,
      onSaveSuccess,
      supportsSteps,
      isSwimming,
      distanceUnitSystem,
      swimUnitSystem,
    ]
  );

  return (
    <FormContainer<CreateActivityFormData>
      onSuccess={onSubmit}
      formContext={formContext}
    >
      <Box marginTop={1}></Box>
      <DividedStack>
        <Stack direction="column" rowGap={4}>
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
            disableFuture={!isBeforeToday(dayjs(watch("startTime")))}
            rules={{ validate: { startTime: validateStartTime } }}
          />
          <TextFieldElement
            name="durationMinutes"
            type="number"
            label="Duration"
            autoComplete="off"
            rules={{ min: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">mins</InputAdornment>
              ),
            }}
          />
        </Stack>
        <Stack direction="column" rowGap={4}>
          {supportsSteps && (
            <CheckboxElement name="useSteps" label="Use steps" />
          )}
          {useSteps ? (
            <TextFieldElement
              type="number"
              name="distance"
              label="Steps"
              autoComplete="off"
            />
          ) : (
            <TextFieldElement
              type="number"
              name="distance"
              label="Distance"
              autoComplete="off"
              rules={{ required: distanceIsRequired }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isSwimming
                      ? localizedSwimMetersName
                      : localizedKilometersName}
                  </InputAdornment>
                ),
              }}
            />
          )}
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
        </Stack>
      </DividedStack>

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
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="lg">
      <DialogTitle>Log activity</DialogTitle>
      <DialogContent>
        <CreateActivityLog onSaveSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
