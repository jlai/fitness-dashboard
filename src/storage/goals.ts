"use client";

import { atom } from "jotai";
import { atomFamily } from "jotai-family";

import {
  createDefaultClientOnlyGoalsData,
  createSettingsBlobAtom,
  clientOnlyGoalsStoredSchema,
  SETTINGS_STORAGE_KEYS,
  type ClientGoal,
  type ClientOnlyGoalsData,
  type GoalPeriod,
} from "@/storage/settings-storage";

export type { ClientGoal, ClientOnlyGoalsData, GoalPeriod };

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

export const clientOnlyGoalsAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.clientOnlyGoals,
  schema: clientOnlyGoalsStoredSchema,
  defaultData: createDefaultClientOnlyGoalsData,
});

interface GoalAtomParam {
  metric: GoalMetric;
  period: GoalPeriod;
}

function findGoal(
  data: ClientOnlyGoalsData,
  metric: GoalMetric,
  period: GoalPeriod,
): ClientGoal | undefined {
  return data.clientOnlyGoals.find(
    (goal) => goal.metric === metric && goal.period === period,
  );
}

const goalsAtomFamily = atomFamily(
  ({ metric, period }: GoalAtomParam) => {
    return atom(
      (get) => {
        const dataOrPromise = get(clientOnlyGoalsAtom);

        if (dataOrPromise instanceof Promise) {
          return dataOrPromise.then((data) => findGoal(data, metric, period));
        }

        return findGoal(dataOrPromise, metric, period);
      },
      async (_get, set, update: GoalWrite) => {
        await set(clientOnlyGoalsAtom, (prev) => {
          const clientOnlyGoals = [...prev.clientOnlyGoals];
          const index = clientOnlyGoals.findIndex(
            (goal) => goal.metric === metric && goal.period === period,
          );
          const next: ClientGoal = {
            metric,
            period,
            value: update.value,
            unit: update.unit,
          };

          if (index >= 0) {
            clientOnlyGoals[index] = next;
          } else {
            clientOnlyGoals.push(next);
          }

          return { clientOnlyGoals };
        });
      },
    );
  },
  (a, b) => a.metric === b.metric && a.period === b.period,
);

export function getGoalsAtom(metric: GoalMetric, period: GoalPeriod) {
  return goalsAtomFamily({ metric, period });
}
