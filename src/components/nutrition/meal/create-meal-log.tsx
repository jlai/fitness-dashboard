import { Button } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FormContainer, useForm } from "react-hook-form-mui";
import { useAtomValue } from "jotai";
import NextLink from "next/link";

import {
  CreateFoodLogOptions,
  Meal,
  MealType,
  buildCreateMultipleFoodLogsMutation,
} from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { DividedStack } from "@/components/layout/flex";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { MealTypeElement } from "../food/meal-type-element";

import { SearchMealsElement } from "./meal-search";

interface CreateMealLogFormData {
  meal: Meal | null;
  mealType: MealType;
  daySource: DaySelectorSource;
}

export default function CreateMealLog() {
  const formContext = useForm<CreateMealLogFormData>({
    defaultValues: {
      daySource: "today",
      meal: null,
      mealType: MealType.Anytime,
    },
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();
  const { mutateAsync: logFoods } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient)
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);

  const logMeal = withErrorToaster(async (values: CreateMealLogFormData) => {
    const { meal, mealType, daySource } = values;

    if (!meal) {
      return;
    }

    const day = daySource === "today" ? dayjs() : linkedDay;

    const foods = meal.mealFoods.map(
      (food) =>
        ({
          foodId: food.foodId,
          mealTypeId: mealType,
          unitId: food.unit!.id,
          amount: food.amount,
          day,
        } as CreateFoodLogOptions)
    );

    await logFoods(foods);
    showSuccessToast(`Logged meal: ${meal.name}`);
    formContext.reset({
      daySource, // keep same
      mealType, // keep same

      meal: null,
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
            <FormRow>
              <SearchMealsElement name="meal" />
            </FormRow>
            <FormRow>
              <MealTypeElement name="mealType" />
              <LinkedDayElement name="daySource" />
              <div className="flex-grow min-w-0"></div>
              <Button type="submit" disabled={!watch("meal")}>
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
