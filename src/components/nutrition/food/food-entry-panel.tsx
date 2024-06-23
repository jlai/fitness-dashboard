"use client";

import { Suspense, useCallback, useState } from "react";
import { Button } from "@mui/material";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "mui-sonner";

import { Food, MealType } from "@/api/nutrition";
import { getCreateFoodLogMutation } from "@/api/nutrition/manage";

import MealTypeInput from "./meal-type-input";
import FoodSearch from "./food-search";
import { FoodQuantityInput, ServingSize } from "./food-quantity-input";

export default function FoodEntryPanel() {
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedServingSize, setSelectedServingSize] =
    useState<ServingSize | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    MealType.Anytime
  );

  const queryClient = useQueryClient();
  const { mutateAsync: createFood } = useMutation(
    getCreateFoodLogMutation(queryClient)
  );

  const logFood = useCallback(() => {
    if (!selectedFood || !selectedServingSize) {
      return;
    }

    createFood({
      foodId: selectedFood.foodId,
      mealTypeId: selectedMealType,
      day: dayjs(),
      amount: selectedServingSize.amount,
      unitId: selectedServingSize.unit.id,
    }).then(() => {
      toast.success(`Logged food: ${selectedFood.name}`);
      setSelectedFood(null);
    });
  }, [createFood, selectedFood, selectedMealType, selectedServingSize]);

  return (
    <div className="flex flex-col gap-y-8 w-full">
      <FoodSearch onSelectFood={(food) => setSelectedFood(food)} />
      <div className="flex flex-row flex-wrap">
        <div className="flex flex-row flex-1 flex-wrap gap-x-4">
          <FoodQuantityInput
            food={selectedFood}
            servingSize={null}
            onServingSizeChange={setSelectedServingSize}
          />
          <MealTypeInput
            value={selectedMealType}
            onSelect={setSelectedMealType}
          />
          <div className="flex-1"></div>
        </div>
        <Button
          onClick={logFood}
          disabled={!selectedFood || !selectedMealType || !selectedServingSize}
        >
          Log food
        </Button>
      </div>
    </div>
  );
}
