import { SelectElement } from "react-hook-form-mui";

import { MEAL_TYPE_NAMES, NutritionLogMealType } from "@/api/nutrition";

const options = [
  NutritionLogMealType.ANYTIME,
  NutritionLogMealType.BEFORE_BREAKFAST,
  NutritionLogMealType.BREAKFAST,
  NutritionLogMealType.BEFORE_LUNCH,
  NutritionLogMealType.LUNCH,
  NutritionLogMealType.BEFORE_DINNER,
  NutritionLogMealType.DINNER,
  NutritionLogMealType.AFTER_DINNER,
  NutritionLogMealType.SNACK,
].map((id) => ({
  id,
  label: MEAL_TYPE_NAMES[id],
}));

export function MealTypeElement({
  name,
  fullWidth,
  disabled,
}: {
  name: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  return (
    <SelectElement
      name={name}
      label="When"
      options={options}
      fullWidth={fullWidth}
      disabled={disabled}
    />
  );
}
