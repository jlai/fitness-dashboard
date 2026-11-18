import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import Immutable from "immutable";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { FormContainer, useForm } from "react-hook-form-mui";
import {
  DatePickerElement,
  TimePickerElement,
} from "react-hook-form-mui/date-pickers";

import { MealTypeElement } from "@/components/nutrition/food/meal-type-element";
import {
  NutritionLogMealType,
  buildCreateMultipleFoodLogsMutation,
} from "@/api/nutrition";
import { FormRows } from "@/components/forms/form-row";
import { getLabel } from "@/components/day-navigator";
import { selectedDayForPageAtom } from "@/state";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import { MissingScopesAlert } from "@/components/require-scopes";
import { NUTRITION_WRITEONLY } from "@/config/google-health-scopes";
import { useMissingScopes } from "@/api/auth";
import { presetMealClockTimesAtom } from "@/storage/settings";

import { selectedFoodLogsAtom } from "../atoms";

import { copyDialogOpenAtom } from "./atoms";

interface CopyFoodLogsFormData {
  day: Dayjs;
  time: Dayjs | null;
  mealType: NutritionLogMealType;
}

export function CopyFoodLogsDialog() {
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  const timeWasCleared = useRef(false);
  const presetTimeWasApplied = useRef(false);
  const [open, setOpen] = useAtom(copyDialogOpenAtom);
  const [selectedDay, setSelectedDay] = useAtom(selectedDayForPageAtom);
  const queryClient = useQueryClient();
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);
  const presetMealClockTimes = useAtomValue(presetMealClockTimesAtom);
  const formContext = useForm<CopyFoodLogsFormData>({
    defaultValues: {
      day: dayjs().startOf("day"),
      time: null,
      mealType: NutritionLogMealType.ANYTIME,
    },
  });
  const mealType = formContext.watch("mealType");

  const { mutateAsync: createFoodLogs, isPending: isSubmitting } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient),
  );

  const cannotWrite = useMissingScopes([NUTRITION_WRITEONLY]).length > 0;

  useEffect(() => {
    if (timeWasCleared.current) {
      formContext.setValue("time", null);
      return;
    }

    const time = presetMealClockTimes.enabled
      ? presetMealClockTimes.times[mealType]
      : undefined;
    if (!time) {
      if (presetTimeWasApplied.current) {
        formContext.setValue("time", null);
        presetTimeWasApplied.current = false;
      }
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    formContext.setValue(
      "time",
      (formContext.getValues("time") ?? dayjs())
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0),
    );
    presetTimeWasApplied.current = true;
  }, [formContext, mealType, presetMealClockTimes]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(dayjs());
    const untilNextMinute =
      60_000 - dayjs().second() * 1_000 - dayjs().millisecond();
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      updateCurrentTime();
      interval = setInterval(updateCurrentTime, 60_000);
    }, untilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, []);

  const onSubmit = withErrorToaster(async (values: CopyFoodLogsFormData) => {
    if (isSubmitting) {
      return;
    }

    const time = values.time ?? dayjs();
    const logDay = values.day
      .hour(time.hour())
      .minute(time.minute())
      .second(time.second())
      .millisecond(time.millisecond());

    await createFoodLogs(
      [...selectedFoodLogs.values()].map((foodLog) => ({
        nutritionLog: {
          ...foodLog.nutritionLog,
          mealType: values.mealType,
        },
        day: logDay,
      })),
    );

    showSuccessToast("Copied food logs", {
      action: !values.day.isSame(selectedDay, "day")
        ? {
            label: <>Go to {getLabel(values.day)}</>,
            onClick: () => setSelectedDay(values.day),
          }
        : undefined,
    });

    setSelectedFoodLogs(Immutable.Set());
    setOpen(false);
  }, "Error copying food logs");

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <FormContainer onSuccess={onSubmit} formContext={formContext}>
        <DialogTitle>Copy selected foods</DialogTitle>
        <DialogContent>
          <MissingScopesAlert scopes={[NUTRITION_WRITEONLY]}>
            {selectedFoodLogs.size > 1 ? (
              <p>
                Copy the selected {selectedFoodLogs.size} foods to another day.
              </p>
            ) : (
              <p>Copy selected food to another day.</p>
            )}
            <FormRows mt={4}>
              <DatePickerElement
                name="day"
                label="To date"
                rules={{ required: true }}
                disabled={cannotWrite}
              />
              <MealTypeElement
                name="mealType"
                fullWidth
                disabled={cannotWrite}
              />
              <TimePickerElement
                name="time"
                label="Time"
                disabled={cannotWrite}
                onChange={(value) => {
                  timeWasCleared.current = value === null;
                  presetTimeWasApplied.current = false;
                }}
                inputProps={{
                  InputLabelProps: { shrink: true },
                  placeholder: currentTime.format("h:mm A"),
                }}
              />
            </FormRows>
          </MissingScopesAlert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={cannotWrite}>
            Copy
          </Button>
        </DialogActions>
      </FormContainer>
    </Dialog>
  );
}
