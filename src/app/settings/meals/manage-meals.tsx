"use client";

import { Alert, Button, Divider, Link, Paper, Typography } from "@mui/material";
import { useState, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { unwrap } from "jotai/utils";
import NextLink from "next/link";

import {
  Meal,
  MealSummary,
  buildMealDetailsQuery,
  mealSummaryFromMeal,
} from "@/api/nutrition";
import SearchMeals from "@/components/nutrition/meal/meal-search";
import { useUnits } from "@/config/units";
import { CreateOrEditMeal } from "@/components/nutrition/meal/edit-meal";
import { DividedStack } from "@/components/layout/flex";
import { countMealsWithMissingFoodNames, mealsAtom } from "@/storage/meals";

const mealsWithoutSuspenseAtom = unwrap(mealsAtom);

export default function ManageMeals() {
  // Don't need this, just preload for now
  useUnits();

  const meals = useAtomValue(mealsWithoutSuspenseAtom);
  const hasMissingFoodNames =
    meals !== undefined && countMealsWithMissingFoodNames(meals.meals) > 0;
  const [selectedMeal, setSelectedMeal] = useState<MealSummary | null>(null);
  const [draftMeal, setDraftMeal] = useState<Meal | null>(null);
  const mealDetailsQuery = useQuery({
    ...buildMealDetailsQuery(selectedMeal?.id ?? ""),
    enabled: selectedMeal !== null && draftMeal?.id !== selectedMeal.id,
  });
  const mealToEdit = draftMeal ?? mealDetailsQuery.data ?? null;

  const selectMeal = useCallback(
    (meal: MealSummary | null) => {
      setSelectedMeal(meal);
      setDraftMeal(null);
    },
    [setDraftMeal, setSelectedMeal],
  );

  const createNewMeal = useCallback(() => {
    setSelectedMeal(null);
    setDraftMeal({
      id: "",
      name: "",
      description: "",
      mealFoods: [],
    });
  }, []);

  const onUpdateMeal = useCallback(
    (meal: Meal | null, { created }: { created?: boolean } = {}) => {
      if (meal) {
        setSelectedMeal(mealSummaryFromMeal(meal));
        setDraftMeal(meal);
      } else {
        setSelectedMeal(null);
        setDraftMeal(null);
      }
    },
    [],
  );

  return (
    <Paper className="p-4">
      <Typography variant="h4" className="mb-8">
        Manage meals
      </Typography>
      {hasMissingFoodNames && (
        <Alert severity="info" className="mb-4">
          Missing food names in the meal search? Go to the{" "}
          <Link href="/settings/advanced" component={NextLink}>
            Troubleshooting page
          </Link>{" "}
          to fix
        </Alert>
      )}
      <DividedStack>
        <div className="flex-1">
          <Suspense>
            <SearchMeals
              className="flex-1"
              value={selectedMeal}
              onChange={selectMeal}
            />
          </Suspense>
        </div>
        <Button onClick={createNewMeal}>Create new</Button>
      </DividedStack>
      {selectedMeal && mealDetailsQuery.error && (
        <Alert severity="error" className="mt-4">
          {mealDetailsQuery.error instanceof Error
            ? mealDetailsQuery.error.message
            : "Unable to load meal details."}
        </Alert>
      )}
      {mealToEdit && (
        <>
          <Divider className="my-8" />
          <Suspense>
            {mealToEdit && (
              <CreateOrEditMeal
                initialMeal={mealToEdit}
                onUpdateMeal={onUpdateMeal}
              />
            )}
          </Suspense>
        </>
      )}
    </Paper>
  );
}
