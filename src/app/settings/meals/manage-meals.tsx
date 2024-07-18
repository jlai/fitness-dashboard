"use client";

import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { useState, useCallback, Suspense } from "react";

import { Meal } from "@/api/nutrition";
import SearchMeals from "@/components/nutrition/meal/meal-search";
import { useUnits } from "@/config/units";
import { CreateOrEditMeal } from "@/components/nutrition/meal/edit-meal";

export default function ManageMeals() {
  // Don't need this, just preload for now
  useUnits();

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [draftMeal, setDraftMeal] = useState<Meal | null>(null);

  const selectMeal = useCallback(
    (meal: Meal | null) => {
      setSelectedMeal(meal);
      setDraftMeal(meal);
    },
    [setDraftMeal, setSelectedMeal]
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
        setSelectedMeal(meal);
        setDraftMeal(meal);
      }
    },
    []
  );

  return (
    <Paper className="p-4">
      <Typography variant="h4" className="mb-8">
        Manage meals
      </Typography>
      <Stack
        direction="row"
        columnGap={4}
        divider={<Divider orientation="vertical" flexItem />}
      >
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
      </Stack>
      {draftMeal && (
        <>
          <Divider className="my-8" />
          <Suspense>
            {draftMeal && (
              <CreateOrEditMeal
                initialMeal={draftMeal}
                onUpdateMeal={onUpdateMeal}
              />
            )}
          </Suspense>
        </>
      )}
    </Paper>
  );
}
