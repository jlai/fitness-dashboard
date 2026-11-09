"use client";

import { ArticleOutlined } from "@mui/icons-material";
import { Button, IconButton, Stack } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormContainer, useForm } from "react-hook-form-mui";
import { useAtomValue, useSetAtom } from "jotai";
import { usePopupState } from "material-ui-popup-state/hooks";
import dayjs from "dayjs";
import NextLink from "next/link";

import {
  Food,
  MealType,
  buildCreateFoodLogMutation,
  nutritionLogFromMealFood,
  toNutritionLogMealType,
} from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { ServingSize } from "@/utils/food-amounts";
import { DividedStack } from "@/components/layout/flex";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import NutritionPopover, {
  nutritionPopoverFoodAtom,
} from "@/components/nutrition/label/nutrition-popover";
import { macroGoalsAtom } from "@/storage/settings";

import { SearchFoodsElement } from "./food-search";
import {
  FoodServingSizeElement,
  getDefaultFoodServingSize,
} from "./serving-size";
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
    buildCreateFoodLogMutation(queryClient),
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);
  const macroGoals = useAtomValue(macroGoalsAtom);
  const setPopoverFood = useSetAtom(nutritionPopoverFoodAtom);
  const nutritionPopupState = usePopupState({
    popupId: "food-logger-nutrition-info",
    variant: "popper",
  });
  const food = watch("food");
  const servingSize = watch("servingSize");

  const logFood = withErrorToaster(async (values: CreateFoodLogFormData) => {
    const { food, servingSize, mealType, daySource } = values;

    if (!food || !servingSize || isSubmitting) {
      return;
    }

    await createFood({
      nutritionLog: nutritionLogFromMealFood(
        { ...food, amount: servingSize.amount, unit: servingSize.unit },
        toNutritionLogMealType(mealType),
        servingSize.servingAmount !== undefined
          ? (servingSize.amount / servingSize.servingAmount) *
              (servingSize.multiplier ?? 1)
          : undefined,
      ),
      day: daySource === "today" ? dayjs() : linkedDay,
    });
    showSuccessToast(`Logged food: ${food.name}`);
    reset({
      food: null,
      servingSize: null,

      // Stay on existing day and mealType
      mealType: values.mealType,
      daySource,
    });
  }, "Error logging food");

  return (
    <FormContainer<CreateFoodLogFormData>
      handleSubmit={handleSubmit(logFood)}
      formContext={formContext}
    >
      <FormRows>
        <FormRow flexWrap="nowrap" className="gap-x-2">
          <div className="flex-1 min-w-0">
            <SearchFoodsElement
              name="food"
              rules={{ required: true }}
              onChange={(food) => {
                formContext.setValue(
                  "servingSize",
                  food ? getDefaultFoodServingSize(food) : null,
                  { shouldValidate: !!food },
                );
                if (!food) {
                  formContext.clearErrors("servingSize");
                }
              }}
            />
          </div>
          <IconButton
            aria-label="Nutrition info"
            title="Nutrition info"
            disabled={!food || !servingSize}
            onClick={(event) => {
              if (!food || !servingSize) return;
              setPopoverFood({
                foodId: food.foodId,
                food,
                nutritionLog: null,
                servingSize,
              });
              if (!nutritionPopupState.isOpen) {
                nutritionPopupState.open(event);
              }
            }}
          >
            <ArticleOutlined />
          </IconButton>
        </FormRow>
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
            disabled={
              !watch("food") ||
              !watch("servingSize") ||
              isLoading ||
              isSubmitting
            }
          >
            Log food
          </Button>
        </FormRow>
      </FormRows>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={nutritionPopupState}
        placement="bottom"
      />
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
        <Button href="/settings/foods/favorite" LinkComponent={NextLink}>
          Favorites
        </Button>
        <Button href="/settings/foods/custom" LinkComponent={NextLink}>
          Food templates
        </Button>
      </Stack>
    </DividedStack>
  );
}
