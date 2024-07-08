import { SelectElement } from "react-hook-form-mui";

import { MealType } from "@/api/nutrition";

const options = [
  { id: MealType.Anytime, label: "Anytime" },
  { id: MealType.Breakfast, label: "Breakfast" },
  { id: MealType.MorningSnack, label: "Morning snack" },
  { id: MealType.Lunch, label: "Lunch" },
  { id: MealType.AfternoonSnack, label: "Afternoon snack" },
  { id: MealType.Dinner, label: "Dinner" },
];

export function MealTypeElement({ name }: { name: string }) {
  return (
    <SelectElement
      name={name}
      label="When"
      SelectProps={{ autoWidth: true }}
      options={options}
    />
  );
}
