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
import { useForm } from "react-hook-form";
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
  buildCreateExerciseMutation,
  CreateExerciseDistanceUnit,
} from "@/api/exercise/exercise";
import {
  STEPS_EXERCISE_TYPES,
  SWIMMING_EXERCISE_TYPES,
} from "@/api/exercise/helpers";
import { SettingsDistanceUnit, SettingsSwimUnit } from "@/api/user";
import { useUnits } from "@/config/units";
import { isBeforeToday } from "@/utils/date-utils";

import { DividedStack } from "../layout/flex";
import { showSuccessToast, withErrorToaster } from "../toast";

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
    buildCreateExerciseMutation(queryClient),
  );

  const distanceIsRequired = watch("activityType")?.requiresDistance;
  const selectedTypeId = watch("activityType")?.id;
  const supportsSteps = selectedTypeId
    ? STEPS_EXERCISE_TYPES.has(selectedTypeId)
    : false;
  const isSwimming = selectedTypeId
    ? SWIMMING_EXERCISE_TYPES.has(selectedTypeId)
    : false;
  const useSteps = supportsSteps && watch("useSteps");

  const onSubmit = withErrorToaster(async (values: CreateActivityFormData) => {
    let unit: CreateExerciseDistanceUnit =
      distanceUnitSystem === SettingsDistanceUnit.DISTANCE_UNIT_MILES
        ? "mile"
        : "kilometer";

    if (supportsSteps && values.useSteps) {
      unit = "steps";
    } else if (isSwimming) {
      unit =
        swimUnitSystem === SettingsSwimUnit.SWIM_UNIT_YARDS ? "yards" : "meter";
    }

    await createActivityLog({
      exerciseType: values.activityType!.id,
      startTime: values.startTime,
      durationMinutes: values.durationMinutes,
      distance: values.distance,
      distanceUnit: unit,
      manualCalories: values.manualCalories,
    });

    onSaveSuccess?.();
    showSuccessToast("Logged activity");
  }, "Error logging activity");

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
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
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
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {isSwimming
                        ? localizedSwimMetersName
                        : localizedKilometersName}
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
          <TextFieldElement
            name="manualCalories"
            type="number"
            label="Calories"
            autoComplete="off"
            rules={{ min: 1 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">cal</InputAdornment>
                ),
              },
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
