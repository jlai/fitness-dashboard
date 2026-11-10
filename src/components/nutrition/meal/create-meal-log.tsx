import { EditNote } from "@mui/icons-material";
import { Button, IconButton, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FormContainer, useForm } from "react-hook-form-mui";
import { useAtomValue } from "jotai";
import NextLink from "next/link";
import { useState } from "react";

import {
  CreateFoodLogOptions,
  MealFood,
  MealSummary,
  NutritionLogMealType,
  buildCreateMultipleFoodLogsMutation,
  buildMealDetailsQuery,
  nutritionLogFromMealFood,
} from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { DividedStack } from "@/components/layout/flex";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { MealTypeElement } from "../food/meal-type-element";

import { MealFoodListEditor } from "./edit-meal";
import { SearchMealsElement } from "./meal-search";

interface CreateMealLogFormData {
  meal: MealSummary | null;
  mealType: NutritionLogMealType;
  daySource: DaySelectorSource;
  foods: Array<MealFood>;
}

export default function CreateMealLog() {
  const [mealEditorMode, setMealEditorMode] = useState(false);
  const formContext = useForm<CreateMealLogFormData>({
    defaultValues: {
      daySource: "today",
      meal: null,
      mealType: NutritionLogMealType.ANYTIME,
      foods: [],
    },
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();
  const { mutateAsync: logFoods } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient),
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);

  const toggleMealEditor = withErrorToaster(async () => {
    if (mealEditorMode) {
      setMealEditorMode(false);
      return;
    }

    const meal = formContext.getValues("meal");
    const foods = meal
      ? (await queryClient.fetchQuery(buildMealDetailsQuery(meal.id))).mealFoods
      : [];
    formContext.setValue("foods", foods);
    setMealEditorMode(true);
  }, "Error loading meal");

  const logMeal = withErrorToaster(async (values: CreateMealLogFormData) => {
    const { meal, mealType, daySource } = values;

    if (!mealEditorMode && !meal) {
      return;
    }

    const day = daySource === "today" ? dayjs() : linkedDay;
    const mealFoods = mealEditorMode
      ? values.foods
      : (await queryClient.fetchQuery(buildMealDetailsQuery(meal!.id)))
          .mealFoods;
    const foods = mealFoods.map(
      (food) =>
        ({
          nutritionLog: nutritionLogFromMealFood(food, mealType),
          day,
        }) as CreateFoodLogOptions,
    );

    await logFoods(foods);
    showSuccessToast(meal ? `Logged meal: ${meal.name}` : "Logged meal");
    formContext.reset({
      daySource, // keep same
      mealType, // keep same
      meal: null,
      foods: [],
    });
  }, "Error logging meal");

  return (
    <FormContainer<CreateMealLogFormData>
      formContext={formContext}
      onSuccess={logMeal}
    >
      <DividedStack>
        <div className="flex-1">
          <FormRows>
            <FormRow flexWrap="nowrap" className="gap-x-2">
              <div className="flex-1 min-w-0">
                <SearchMealsElement name="meal" disabled={mealEditorMode} />
              </div>
              <IconButton
                aria-label="Adjust meal"
                title="Adjust meal"
                color={mealEditorMode ? "primary" : "default"}
                aria-pressed={mealEditorMode}
                onClick={toggleMealEditor}
              >
                <EditNote />
              </IconButton>
            </FormRow>
            {mealEditorMode && (
              <div>
                <Typography variant="h6">Foods to log</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="mb-4"
                >
                  Adjust foods before logging; this will not change the existing
                  meal template.
                </Typography>
                <MealFoodListEditor />
              </div>
            )}
            <FormRow>
              <MealTypeElement name="mealType" />
              <LinkedDayElement name="daySource" />
              <div className="flex-grow min-w-0"></div>
              <Button
                type="submit"
                disabled={
                  mealEditorMode ? watch("foods").length === 0 : !watch("meal")
                }
              >
                Log meal
              </Button>
            </FormRow>
          </FormRows>
        </div>
        <div>
          <Button href="/settings/meals" LinkComponent={NextLink}>
            Manage meals
          </Button>
        </div>
      </DividedStack>
    </FormContainer>
  );
}
