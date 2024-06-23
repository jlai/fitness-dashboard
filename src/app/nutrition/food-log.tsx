import { Dayjs } from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Fragment, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  FoodLogEntry,
  MEAL_TYPE_NAMES,
  MealType,
  getFoodLogQuery,
} from "@/api/nutrition";

const NUTRIENT_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

interface MealTypeSummary {
  id: number;
  name: string;
  foods: FoodLogEntry[];
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
}

function groupByMealType(foods: Array<FoodLogEntry>) {
  const mealTypeSummaries = new Map<number, MealTypeSummary>();

  const defaultNutrients = {
    calories: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    protein: 0,
    sodium: 0,
  };

  for (const mealType of [
    MealType.Breakfast,
    MealType.MorningSnack,
    MealType.Lunch,
    MealType.AfternoonSnack,
    MealType.Dinner,
    MealType.Anytime,
  ]) {
    mealTypeSummaries.set(mealType, {
      id: mealType,
      name: MEAL_TYPE_NAMES[mealType]!,
      foods: [],
      ...defaultNutrients,
    });
  }

  const total = {
    id: -1,
    name: "Total",
    foods: [],
    ...defaultNutrients,
  };

  mealTypeSummaries.set(-1, total);

  for (const food of foods) {
    const summary = mealTypeSummaries.get(food.loggedFood.mealTypeId);
    if (summary) {
      summary.foods.push(food);

      const {
        loggedFood: { calories = 0 },
        nutritionalValues: {
          carbs = 0,
          fat = 0,
          fiber = 0,
          protein = 0,
          sodium = 0,
        } = {},
      } = food;

      summary.calories += calories;
      summary.carbs += carbs;
      summary.fat += fat;
      summary.fiber += fiber;
      summary.protein += protein;
      summary.sodium += sodium;

      total.calories += calories;
      total.carbs += carbs;
      total.fat += fat;
      total.fiber += fiber;
      total.protein += protein;
      total.sodium += sodium;
    }
  }

  return mealTypeSummaries;
}

function formatNutrientPropValue(
  nutritionalValues: FoodLogEntry["nutritionalValues"],
  prop: string
) {
  const value = ((nutritionalValues ?? {}) as Record<string, number>)[prop];

  if (value !== undefined) {
    return NUTRIENT_FORMAT.format(value);
  }

  return undefined;
}

export default function FoodLog({ day }: { day: Dayjs }) {
  const { data: foodLog } = useSuspenseQuery(getFoodLogQuery(day));
  const groupedMealTypes = useMemo(
    () => groupByMealType(foodLog.foods),
    [foodLog]
  );

  return (
    <div className="max-w-full overflow-x-auto">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Food</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Calories</TableCell>
            <TableCell>Carbs</TableCell>
            <TableCell>Fat</TableCell>
            <TableCell>Fiber</TableCell>
            <TableCell>Protein</TableCell>
            <TableCell>Sodium</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...groupedMealTypes.values()]
            .filter((summary) => summary.foods.length > 0 || summary.id === -1)
            .map((summary) => (
              <Fragment key={summary.id}>
                <TableRow className="bg-slate-50">
                  <TableCell className="font-medium">{summary.name}</TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    {NUTRIENT_FORMAT.format(summary.calories)}
                  </TableCell>
                  {["carbs", "fat", "fiber", "protein", "sodium"].map(
                    (prop) => (
                      <TableCell key={prop}>
                        {formatNutrientPropValue(summary, prop)}
                      </TableCell>
                    )
                  )}
                </TableRow>
                {summary.foods.map(
                  ({
                    logId,
                    loggedFood: { name, amount, unit, calories },
                    nutritionalValues,
                  }) => (
                    <TableRow key={logId}>
                      <TableCell>
                        <span className="ml-8">{name}</span>
                      </TableCell>
                      <TableCell>
                        {amount} {amount === 1 ? unit?.name : unit?.plural}
                      </TableCell>
                      <TableCell>{NUTRIENT_FORMAT.format(calories)}</TableCell>
                      {["carbs", "fat", "fiber", "protein", "sodium"].map(
                        (prop) => (
                          <TableCell key={prop}>
                            {formatNutrientPropValue(nutritionalValues, prop)}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  )
                )}
              </Fragment>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
