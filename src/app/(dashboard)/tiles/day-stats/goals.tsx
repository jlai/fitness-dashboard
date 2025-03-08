import { Box, Button, InputAdornment, Stack, Typography } from "@mui/material";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";

import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import {
  buildDailySummaryQuery,
  buildTimeSeriesQuery,
  GetDailyActivitySummaryResponse,
  GoalResource,
  TimeSeriesResource,
} from "@/api/activity";
import {
  buildActivityGoalsQuery,
  buildUpdateActivityGoalMutation,
} from "@/api/activity/goals";
import { FormRow } from "@/components/forms/form-row";
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
                {FRACTION_DIGITS_1.format(currentTotal)} /{" "}
                {FRACTION_DIGITS_1.format(dailyGoal)} {unit}
              </Typography>
              {currentTotal < dailyGoal && (
                <Typography>
                  {FRACTION_DIGITS_1.format(dailyGoal - currentTotal)} {unit} to
                  go
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
                {FRACTION_DIGITS_1.format(currentTotal)} /{" "}
                {FRACTION_DIGITS_1.format(weeklyGoal)} {unit}
              </Typography>
              {currentTotal < weeklyGoal && (
                <Typography>
                  {FRACTION_DIGITS_1.format(weeklyGoal - currentTotal)} {unit}{" "}
                  to go
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

  const [{ data: daySummary }, { data: weeklyGoals }, { data: weekData }] =
    useSuspenseQueries({
      queries: [
        buildDailySummaryQuery(day),
        buildActivityGoalsQuery("weekly"),
        buildTimeSeriesQuery(resource, startDay, endDay),
      ],
    });

  // Older daily summaries seem to be missing goal information, so conditionally
  // fetch it if needed
  const [goalsResult] = useSuspenseQueries({
    queries: !daySummary.goals
      ? [buildActivityGoalsQuery("daily")]
      : ([] as any),
  });

  if (!daySummary.goals && goalsResult) {
    daySummary.goals =
      goalsResult.data as GetDailyActivitySummaryResponse["goals"];
  }

  return { daySummary, weeklyGoals, weekData };
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
  resource: GoalResource;
  period: "daily" | "weekly";
  label: string;
  unit: string;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateGoal } = useMutation(
    buildUpdateActivityGoalMutation(queryClient)
  );

  const fetchDefaultValues = async () => ({
    goal: (await queryClient.fetchQuery(buildActivityGoalsQuery(period)))[
      resource
    ]!,
  });

  const form = useForm<GoalSettingsFormData>({
    defaultValues: fetchDefaultValues,
  });

  const { formState } = form;

  const submit = withErrorToaster(async (values: GoalSettingsFormData) => {
    await updateGoal({
      resource,
      period,
      goal: values.goal,
    });

    form.reset({
      goal: values.goal,
    });

    showSuccessToast("Updated goal");
  }, "Error updating goal");

  return (
    <FormContainer
      formContext={form}
      onSuccess={submit}
      disabled={formState.isLoading}
    >
      <FormRow>
        <TextFieldElement
          type="number"
          name="goal"
          label={label}
          rules={{ required: true }}
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
          disabled={formState.isLoading || !formState.isDirty}
        >
          Update goal
        </Button>
      </FormRow>
    </FormContainer>
  );
}
