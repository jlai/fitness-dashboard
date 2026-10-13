import { Box, Button, InputAdornment, Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";

import {
  buildTimeSeriesQuery,
  getTimeSeriesValueForDay,
  TimeSeriesResource,
} from "@/api/times-series";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
  useUnits,
} from "@/config/units";
import { FormRow } from "@/components/forms/form-row";
import {
  getGoalsAtom,
  type GoalMetric,
  type GoalPeriod,
  type GoalWrite,
} from "@/storage/goals";
import { NumberFormats } from "@/utils/number-formats";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { useSelectedDay } from "../../state";
import { useTileSetting } from "../tile";

import StatGauge, { StatPercent } from "./stat-gauge";

function GoalSummary({
  title,
  currentTotal,
  goal,
  unit,
}: {
  title: string;
  currentTotal: number;
  goal?: number;
  unit: string;
}) {
  const [, setCurrentTab] = useTileSetting<
    { defaultTab: string },
    "defaultTab"
  >("defaultTab", "overview");

  if (goal != null && goal > 0) {
    return (
      <Stack direction="column" alignItems="center">
        <Typography variant="h5">{title}</Typography>
        <Box width={200} height={200} mt={2}>
          <StatGauge
            value={currentTotal}
            valueMax={goal}
            valueUnits={unit}
            innerContent={<StatPercent ratio={currentTotal / goal} />}
            bottomContent={
              <GoalStatus currentTotal={currentTotal} goal={goal} unit={unit} />
            }
          />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="column" alignItems="center">
      <Typography variant="h5">{title}</Typography>
      <Box width={200} height={200} mt={2}>
        <StatGauge
          muted
          value={currentTotal}
          valueUnits={unit}
          innerContent={<StatPercent />}
          bottomContent={<Typography color="text.disabled">—</Typography>}
        />
      </Box>
      <Button size="small" onClick={() => setCurrentTab("settings")}>
        No goal set
      </Button>
    </Stack>
  );
}

function GoalStatus({
  currentTotal,
  goal,
  unit,
}: {
  currentTotal: number;
  goal: number;
  unit: string;
}) {
  return (
    <Stack direction="column" alignItems="center">
      <Typography>
        {NumberFormats.FRACTION_DIGITS_1.format(currentTotal)} /{" "}
        {NumberFormats.FRACTION_DIGITS_1.format(goal)} {unit}
      </Typography>
      {currentTotal < goal && (
        <Typography>
          {NumberFormats.FRACTION_DIGITS_1.format(goal - currentTotal)} {unit}{" "}
          to go
        </Typography>
      )}
    </Stack>
  );
}

interface DailyGoalSummaryProps {
  currentTotal: number;
  dailyGoal?: number;
  unit: string;
}

export function DailyGoalSummary({
  currentTotal,
  dailyGoal,
  unit,
}: DailyGoalSummaryProps) {
  return (
    <GoalSummary
      title="Daily goal"
      currentTotal={currentTotal}
      goal={dailyGoal}
      unit={unit}
    />
  );
}

interface WeeklyGoalSummaryProps {
  currentTotal: number;
  weeklyGoal?: number;
  unit: string;
}

export function WeeklyGoalSummary({
  currentTotal,
  weeklyGoal,
  unit,
}: WeeklyGoalSummaryProps) {
  return (
    <GoalSummary
      title="Weekly goal"
      currentTotal={currentTotal}
      goal={weeklyGoal}
      unit={unit}
    />
  );
}

export function useDayAndWeekSummary(resource: TimeSeriesResource) {
  const day = useSelectedDay();
  const startDay = day.startOf("week");
  const endDay = day.endOf("week");

  const { data: weekData } = useSuspenseQuery(
    buildTimeSeriesQuery(resource, startDay, endDay),
  );

  const dayValue = Number(getTimeSeriesValueForDay(weekData, day) ?? 0);

  return { dayValue, weekData };
}

interface GoalSettingsFormData {
  goal: number | "";
}

function commitGoalInput(
  setGoal: (update: GoalWrite | undefined) => void,
  unit: string,
  raw: number | "",
) {
  if (raw === "") {
    setGoal(undefined);
    return;
  }

  setGoal({ value: Number(raw), unit });
}

export function GoalSettings({
  metric,
  period,
  label,
  unit,
}: {
  metric: GoalMetric;
  period: GoalPeriod;
  label: string;
  unit: string;
}) {
  const goalAtom = getGoalsAtom(metric, period);
  const [goal, setGoal] = useAtom(goalAtom);

  const defaultValues = useMemo(
    () => ({ goal: goal?.value ?? ("" as const) }),
    [goal],
  );

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    commitGoalInput(setGoal, goal?.unit ?? "", values.goal);

    form.reset({
      goal: values.goal,
    });

    showSuccessToast(values.goal === "" ? "Cleared goal" : "Updated goal");
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
          rules={{ min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isDirty}
        >
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
  const goalAtom = getGoalsAtom("distance", period);
  const [goal, setGoal] = useAtom(goalAtom);
  const { distanceUnit, localizedKilometers } = useUnits();

  const displayGoal =
    goal != null
      ? localizedKilometers(kilometersFromDistanceGoal(goal.value, goal.unit))
      : ("" as const);

  const defaultValues = useMemo(() => ({ goal: displayGoal }), [displayGoal]);

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    commitGoalInput(setGoal, distanceUnit, values.goal);

    form.reset({
      goal: values.goal,
    });

    showSuccessToast(values.goal === "" ? "Cleared goal" : "Updated goal");
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
          rules={{ min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isDirty}
        >
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
  const goalAtom = getGoalsAtom("waterVolume", period);
  const [goal, setGoal] = useAtom(goalAtom);
  const { waterUnit, localizedWaterVolume } = useUnits();

  const displayGoal =
    goal != null
      ? localizedWaterVolume(millilitersFromWaterGoal(goal.value, goal.unit))
      : ("" as const);

  const defaultValues = useMemo(() => ({ goal: displayGoal }), [displayGoal]);

  const form = useForm<GoalSettingsFormData>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    commitGoalInput(setGoal, waterUnit, values.goal);

    form.reset({
      goal: values.goal,
    });

    showSuccessToast(values.goal === "" ? "Cleared goal" : "Updated goal");
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
          rules={{ min: 0 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{unit}</InputAdornment>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isDirty}
        >
          Update goal
        </Button>
      </FormRow>
    </FormContainer>
  );
}
