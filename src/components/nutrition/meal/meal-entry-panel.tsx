import { useCallback, useState } from "react";
import { Button, Divider, Link } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "mui-sonner";

import {
  CreateFoodLogOptions,
  Meal,
  MealType,
  buildCreateMultipleFoodLogsMutation,
} from "@/api/nutrition";

import MealTypeInput from "../food/meal-type-input";

import MealSearch from "./meal-search";

export default function MealEntryPanel() {
  const day = dayjs();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    MealType.Anytime
  );

  const queryClient = useQueryClient();
  const { mutateAsync: logFoods } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient)
  );

  const logMeal = useCallback(() => {
    if (!selectedMeal) {
      return;
    }

    const foods = selectedMeal.mealFoods.map(
      (food) =>
        ({
          foodId: food.foodId,
          mealTypeId: selectedMealType,
          unitId: food.unit!.id,
          amount: food.amount,
          day,
        } as CreateFoodLogOptions)
    );

    logFoods(foods).then(() => {
      toast.success(`Logged meal: ${selectedMeal.name}`);
      setSelectedMeal(null);
    });
  }, [logFoods, selectedMeal, selectedMealType, day]);

  return (
    <div className="flex flex-row gap-x-8">
      <div className="flex-1">
        <MealSearch
          selectedMeal={selectedMeal}
          onSelectMeal={setSelectedMeal}
        />
        <div className="flex flex-row mt-8">
          <MealTypeInput
            value={selectedMealType}
            onSelect={setSelectedMealType}
          />
          <div className="flex-grow min-w-0"></div>
          <Button disabled={!selectedMeal} onClick={logMeal}>
            Log meal
          </Button>
        </div>
      </div>
      <Divider orientation="vertical" flexItem />
      <div>
        <Link href="/settings/meals" component={Button}>
          Manage meals
        </Link>
      </div>
    </div>
  );
}
