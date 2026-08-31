import { Box, Button, InputAdornment, Stack, Typography } from "@mui/material";
import { useSuspenseQueries } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";

import {
  buildDailySummaryQuery,
  buildTimeSeriesQuery,
  TimeSeriesResource,
} from "@/api/activity";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
  useUnits,
} from "@/config/units";
import { FormRow } from "@/components/forms/form-row";
import {
  getDistanceGoalAtom,
  getNumericGoalAtom,
  getWaterGoalAtom,
  GoalPeriod,
  NumericGoalResource,
} from "@/storage/settings";
import { NumberFormats } from "@/utils/number-formats";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { useSelectedDay } from "../../state";

import StatGauge, { StatPercent } from "./stat-gauge";

interface DailyGoalSummaryProps {
  currentTotal: number;
  dailyGoal: number;
  unit: string;
}

export function DailyGoalSummary({
  currentTotal,
  dailyGoal,
  unit,
}: DailyGoalSummaryProps) {
  return (
    <Stack direction="column" alignItems="center">
      <Typography variant="h5">Daily goal</Typography>
      <Box width={200} height={200} mt={2}>
        <StatGauge
          value={currentTotal}
          valueMax={dailyGoal}
          valueUnits={unit}
          innerContent={<StatPercent ratio={currentTotal / dailyGoal} />}
          bottomContent={
            <Stack direction="column" alignItems="center">
              <Typography>
                {NumberFormats.FRACTION_DIGITS_1.format(currentTotal)} /{" "}
                {NumberFormats.FRACTION_DIGITS_1.format(dailyGoal)} {unit}
              </Typography>
              {currentTotal < dailyGoal && (
                <Typography>
                  {NumberFormats.FRACTION_DIGITS_1.format(
                    dailyGoal - currentTotal,
                  )}{" "}
                  {unit} to go
                </Typography>
              )}
            </Stack>
          }
        />
      </Box>
    </Stack>
  );
}

interface WeeklyGoalSummaryProps {
  currentTotal: number;
  weeklyGoal: number;
  unit: string;
}

export function WeeklyGoalSummary({
  currentTotal,
  weeklyGoal,
  unit,
}: WeeklyGoalSummaryProps) {
  return (
    <Stack direction="column" alignItems="center">
      <Typography variant="h5">Weekly goal</Typography>
      <Box width={200} height={200} mt={2}>
        <StatGauge
          value={currentTotal}
          valueMax={weeklyGoal}
          valueUnits={unit}
          innerContent={<StatPercent ratio={currentTotal / weeklyGoal} />}
          bottomContent={
            <Stack direction="column" alignItems="center">
              <Typography>
                {NumberFormats.FRACTION_DIGITS_1.format(currentTotal)} /{" "}
                {NumberFormats.FRACTION_DIGITS_1.format(weeklyGoal)} {unit}
              </Typography>
              {currentTotal < weeklyGoal && (
                <Typography>
                  {NumberFormats.FRACTION_DIGITS_1.format(
                    weeklyGoal - currentTotal,
                  )}{" "}
                  {unit} to go
                </Typography>
              )}
            </Stack>
          }
        />
      </Box>
    </Stack>
  );
}

export function useDayAndWeekSummary(resource: TimeSeriesResource) {
  const day = useSelectedDay();
  const startDay = day.startOf("week");
  const endDay = day.endOf("week");

  const [{ data: daySummary }, { data: weekData }] = useSuspenseQueries({
    queries: [
      buildDailySummaryQuery(day),
      buildTimeSeriesQuery(resource, startDay, endDay),
    ],
  });

  return { daySummary, weekData };
}

interface GoalSettingsFormData {
  goal: number;
}

export function GoalSettings({
  resource,
  period,
  label,
  unit,
}: {
  resource: NumericGoalResource;
  period: GoalPeriod;
  label: string;
  unit: string;
}) {
  const goalAtom = getNumericGoalAtom(period, resource);
  const [goal, setGoal] = useAtom(goalAtom);

  const defaultValues = useMemo(() => ({ goal }), [goal]);

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    setGoal(Number(values.goal));

    form.reset({
      goal: values.goal,
    });

    showSuccessToast("Updated goal");
  }, "Error updating goal");

  return (
    <FormContainer
      formContext={form}
      onSuccess={submit}
      disabled={formState.isSubmitting}
    >
      <FormRow>
        <TextFieldElement
          type="number"
          name="goal"
          label={label}
          rules={{ required: true, min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
          Update goal
        </Button>
      </FormRow>
    </FormContainer>
  );
}

export function DistanceGoalSettings({
  period,
  label,
  unit,
}: {
  period: GoalPeriod;
  label: string;
  unit: string;
}) {
  const goalAtom = getDistanceGoalAtom(period);
  const [goal, setGoal] = useAtom(goalAtom);
  const { distanceUnit, localizedKilometers } = useUnits();

  const displayGoal = localizedKilometers(
    kilometersFromDistanceGoal(goal.value, goal.unit),
  );

  const defaultValues = useMemo(
    () => ({ goal: displayGoal }),
    [displayGoal],
  );

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    setGoal({ value: Number(values.goal), unit: distanceUnit });

    form.reset({
      goal: values.goal,
    });

    showSuccessToast("Updated goal");
  }, "Error updating goal");

  return (
    <FormContainer
      formContext={form}
      onSuccess={submit}
      disabled={formState.isSubmitting}
    >
      <FormRow>
        <TextFieldElement
          type="number"
          name="goal"
          label={label}
          rules={{ required: true, min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
          Update goal
        </Button>
      </FormRow>
    </FormContainer>
  );
}

export function WaterGoalSettings({
  period,
  label,
  unit,
}: {
  period: GoalPeriod;
  label: string;
  unit: string;
}) {
  const goalAtom = getWaterGoalAtom(period);
  const [goal, setGoal] = useAtom(goalAtom);
  const { waterUnit, localizedWaterVolume } = useUnits();

  const displayGoal = localizedWaterVolume(
    millilitersFromWaterGoal(goal.value, goal.unit),
  );

  const defaultValues = useMemo(
    () => ({ goal: displayGoal }),
    [displayGoal],
  );

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    setGoal({ value: Number(values.goal), unit: waterUnit });

    form.reset({
      goal: values.goal,
    });

    showSuccessToast("Updated goal");
  }, "Error updating goal");

  return (
    <FormContainer
      formContext={form}
      onSuccess={submit}
      disabled={formState.isSubmitting}
    >
      <FormRow>
        <TextFieldElement
          type="number"
          name="goal"
          label={label}
          rules={{ required: true, min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
          Update goal
        </Button>
      </FormRow>
    </FormContainer>
  );
}
