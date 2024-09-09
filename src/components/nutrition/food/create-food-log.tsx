"use client";

import { Button, Stack } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "mui-sonner";
import { FormContainer, useForm } from "react-hook-form-mui";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import NextLink from "next/link";
import { DevTool } from "@hookform/devtools";

import { Food, MealType, buildCreateFoodLogMutation } from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { ServingSize } from "@/utils/food-amounts";
import { DividedStack } from "@/components/layout/flex";

import { SearchFoodsElement } from "./food-search";
import { FoodServingSizeElement } from "./serving-size";
import { MealTypeElement } from "./meal-type-element";

interface CreateFoodLogFormData {
  daySource: DaySelectorSource;
  food: Food | null;
  mealType: MealType;
  servingSize: ServingSize | null;
}

export function CreateFoodLogForm() {
  const formContext = useForm<CreateFoodLogFormData>({
    defaultValues: {
      daySource: "today",
      food: null,
      mealType: MealType.Anytime,
      servingSize: null,
    },
  });
  const {
    formState: { isSubmitting, isLoading },
    handleSubmit,
    control,
    watch,
    reset,
  } = formContext;

  const queryClient = useQueryClient();
  const { mutateAsync: createFood } = useMutation(
    buildCreateFoodLogMutation(queryClient)
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);

  const logFood = async (values: CreateFoodLogFormData) => {
    const {food, servingSize, mealType, daySource} = values;

    if (!food || !servingSize || isSubmitting) {
      return;
    }

    await createFood({
      foodId: food.foodId,
      mealTypeId: mealType,
      day: daySource === "today" ? dayjs() : linkedDay,
      amount: servingSize.amount,
      unitId: servingSize.unit.id,
    }).then(() => {
      toast.success(`Logged food: ${food.name}`);
      reset({
        food: null,
        servingSize: null,

        // Stay on existing day and mealType
        mealType: values.mealType,
        daySource,
      });
    });
  }

  return (
    <FormContainer<CreateFoodLogFormData>
      handleSubmit={handleSubmit(logFood)}
      formContext={formContext}
    >
      <DevTool control={control} />
      <FormRows>
        <SearchFoodsElement name="food" rules={{ required: true }} />
        <FormRow>
          <FoodServingSizeElement
            name="servingSize"
            foodFieldName="food"
            rules={{ required: true }}
          />
          <MealTypeElement name="mealType" />
          <LinkedDayElement name="daySource" />
          <div className="flex-1"></div>
          <Button
            type="submit"
            disabled={!watch("food") || !watch("servingSize") || isLoading || isSubmitting}
          >
            Log food
          </Button>
        </FormRow>
      </FormRows>
    </FormContainer>
  );
}

export default function CreateFoodLog() {
  return (
    <DividedStack>
      <div className="flex-1">
        <CreateFoodLogForm />
      </div>
      <Stack direction="column" rowGap={2}>
        <Button href="/settings/foods/custom" LinkComponent={NextLink}>
          Custom foods
        </Button>
        <Button href="/settings/foods/favorite" LinkComponent={NextLink}>
          Favorites
        </Button>
      </Stack>
    </DividedStack>
  );
}
