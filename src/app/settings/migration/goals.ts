import type { GetActivityGoalsResponse } from "@/api/activity";
import type { GetBodyWeightGoalResponse } from "@/api/body/types";
import type { GetSleepGoalResponse } from "@/api/sleep";
import type { GoalPeriod, MigrationGoal } from "@/storage/db/fitbitmigrationdb";

export function goalRowId(goal: Pick<MigrationGoal, "metric" | "period">) {
  return `${goal.metric}:${goal.period}`;
}

function addGoal(
  goals: Array<MigrationGoal>,
  metric: string,
  period: GoalPeriod,
  value: number | undefined,
  units?: string
) {
  if (value === undefined) {
    return;
  }

  if (units) {
    goals.push({ metric, period, value, units });
  } else {
    goals.push({ metric, period, value });
  }
}

function addActivityGoals(
  goals: Array<MigrationGoal>,
  period: "daily" | "weekly",
  activityGoals: GetActivityGoalsResponse["goals"] | undefined
) {
  if (!activityGoals) {
    return;
  }

  addGoal(goals, "steps", period, activityGoals.steps);
  addGoal(goals, "floors", period, activityGoals.floors);
  addGoal(
    goals,
    "distance",
    period,
    activityGoals.distance,
    "kilometers"
  );
  addGoal(
    goals,
    "caloriesOut",
    period,
    activityGoals.caloriesOut,
    "kilocalories"
  );
  addGoal(
    goals,
    "activeMinutes",
    period,
    activityGoals.activeMinutes,
    "minutes"
  );
  addGoal(
    goals,
    "activeZoneMinutes",
    period,
    activityGoals.activeZoneMinutes,
    "minutes"
  );
}

export function buildMigrationGoals({
  dailyActivityGoals,
  weeklyActivityGoals,
  waterGoal,
  sleepGoal,
  weightGoal,
}: {
  dailyActivityGoals?: GetActivityGoalsResponse["goals"];
  weeklyActivityGoals?: GetActivityGoalsResponse["goals"];
  waterGoal?: number;
  sleepGoal?: GetSleepGoalResponse["goal"];
  weightGoal?: GetBodyWeightGoalResponse["goal"];
}): Array<MigrationGoal> {
  const goals: Array<MigrationGoal> = [];

  addActivityGoals(goals, "daily", dailyActivityGoals);
  addActivityGoals(goals, "weekly", weeklyActivityGoals);
  addGoal(goals, "waterVolume", "daily", waterGoal, "milliliters");
  addGoal(goals, "sleep", "daily", sleepGoal?.minDuration, "minutes");
  addGoal(goals, "weight", "target", weightGoal?.weight, "kilograms");

  return goals;
}
