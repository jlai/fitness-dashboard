"use client";

import { atom } from "jotai";
import { atomFamily } from "jotai-family";

import {
  createDefaultGoalsData,
  createSettingsBlobAtom,
  goalsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type GoalsData,
} from "@/storage/settings-storage";
import type { ClientGoal, GoalPeriod } from "@/storage/db/dashdb";

export type { ClientGoal, GoalPeriod };

export type GoalMetric =
  | "steps"
  | "floors"
  | "caloriesOut"
  | "activeMinutes"
  | "activeZoneMinutes"
  | "distance"
  | "waterVolume"
  | "sleep"
  | "weight";

export type GoalWrite = Pick<ClientGoal, "value" | "unit">;

export const goalsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.goals,
  schema: goalsStoredSchema,
  defaultData: createDefaultGoalsData,
});

interface GoalAtomParam {
  metric: GoalMetric;
  period: GoalPeriod;
}

function findGoal(
  data: GoalsData,
  metric: GoalMetric,
  period: GoalPeriod,
): ClientGoal | undefined {
  return data.goals.find(
    (goal) => goal.metric === metric && goal.period === period,
  );
}

const goalsAtomFamily = atomFamily(
  ({ metric, period }: GoalAtomParam) => {
    return atom(
      (get) => {
        const dataOrPromise = get(goalsAtom);

        if (dataOrPromise instanceof Promise) {
          return dataOrPromise.then((data) => findGoal(data, metric, period));
        }

        return findGoal(dataOrPromise, metric, period);
      },
      async (_get, set, update: GoalWrite) => {
        await set(goalsAtom, (prev) => {
          const goals = [...prev.goals];
          const index = goals.findIndex(
            (goal) => goal.metric === metric && goal.period === period,
          );
          const next: ClientGoal = {
            metric,
            period,
            value: update.value,
            unit: update.unit,
          };

          if (index >= 0) {
            goals[index] = next;
          } else {
            goals.push(next);
          }

          return { goals };
        });
      },
    );
  },
  (a, b) => a.metric === b.metric && a.period === b.period,
);

export function getGoalsAtom(metric: GoalMetric, period: GoalPeriod) {
  return goalsAtomFamily({ metric, period });
}
