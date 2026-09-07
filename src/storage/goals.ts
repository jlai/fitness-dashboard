import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { liveQuery } from "dexie";

import { db, type ClientGoal, type GoalPeriod } from "@/storage/db/dashdb";
import { importFromFitbitMigrationDb } from "@/storage/db/import-from-fitbit-migration";

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

interface GoalAtomParam {
  metric: GoalMetric;
  period: GoalPeriod;
}

const goalsAtomFamily = atomFamily(
  ({ metric, period }: GoalAtomParam) => {
    const storedGoalAtom = atom<ClientGoal | undefined>(undefined);

    storedGoalAtom.onMount = (setStoredGoal) => {
      void importFromFitbitMigrationDb();

      const subscription = liveQuery(() =>
        db.clientOnlyGoals.get([metric, period]),
      ).subscribe({
        next: (goal) => setStoredGoal(goal),
      });

      return () => subscription.unsubscribe();
    };

    return atom(
      (get) => get(storedGoalAtom),
      (_get, set, update: GoalWrite) => {
        const next: ClientGoal = {
          metric,
          period,
          value: update.value,
          unit: update.unit,
        };
        set(storedGoalAtom, next);
        void db.clientOnlyGoals.put(next);
      },
    );
  },
  (a, b) => a.metric === b.metric && a.period === b.period,
);

export function getGoalsAtom(metric: GoalMetric, period: GoalPeriod) {
  return goalsAtomFamily({ metric, period });
}
