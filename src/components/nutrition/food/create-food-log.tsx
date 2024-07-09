"use client";

import { useCallback, useState } from "react";
import { Button } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "mui-sonner";
import { FormContainer, useForm } from "react-hook-form-mui";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";

import { Food, MealType, buildCreateFoodLogMutation } from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";

import { SearchFoodsElement } from "./food-search";
import { FoodServingSizeElement, ServingSize } from "./serving-size";
import { MealTypeElement } from "./meal-type-element";

interface CreateFoodLogFormData {
  daySource: DaySelectorSource;
  food: Food | null;
  mealType: MealType;
  servingSize: ServingSize | null;
}

export default function CreateFoodLog() {
  const formContext = useForm<CreateFoodLogFormData>({
    defaultValues: {
      daySource: "today",
      food: null,
      mealType: MealType.Anytime,
      servingSize: null,
    },
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();
  const { mutateAsync: createFood } = useMutation(
    buildCreateFoodLogMutation(queryClient)
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);

  const logFood = useCallback(
    (values: CreateFoodLogFormData) => {
      const { food, servingSize, mealType, daySource } = values;

      if (!food || !servingSize) {
        return;
      }

      createFood({
        foodId: food.foodId,
        mealTypeId: mealType,
        day: daySource === "today" ? dayjs() : linkedDay,
        amount: servingSize.amount,
        unitId: servingSize.unit.id,
      }).then(() => {
        toast.success(`Logged food: ${food.name}`);
        formContext.reset({
          food: null,
          mealType: MealType.Anytime,
          servingSize: null,

          // Stay on existing day
          daySource,
        });
      });
    },
    [createFood, linkedDay, formContext]
  );

  return (
    <FormContainer<CreateFoodLogFormData>
      formContext={formContext}
      onSuccess={logFood}
    >
      <div className="flex flex-col gap-y-8 w-full">
        <SearchFoodsElement name="food" rules={{ required: true }} />
        <div className="flex flex-row flex-wrap">
          <div className="flex flex-row flex-1 items-center flex-wrap gap-x-4">
            <FoodServingSizeElement
              name="servingSize"
              foodFieldName="food"
              rules={{ required: true }}
            />
            <MealTypeElement name="mealType" />
            <LinkedDayElement name="daySource" />
            <div className="flex-1"></div>
          </div>
          <Button
            type="submit"
            disabled={!watch("food") || !watch("servingSize")}
          >
            Log food
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
