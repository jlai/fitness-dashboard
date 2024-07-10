import { SelectElement, SelectElementProps } from "react-hook-form-mui";
import { TextFieldProps } from "@mui/material";

import { MealType } from "@/api/nutrition";

const options = [
  { id: MealType.Anytime, label: "Anytime" },
  { id: MealType.Breakfast, label: "Breakfast" },
  { id: MealType.MorningSnack, label: "Morning snack" },
  { id: MealType.Lunch, label: "Lunch" },
  { id: MealType.AfternoonSnack, label: "Afternoon snack" },
  { id: MealType.Dinner, label: "Dinner" },
  { id: MealType.EveningSnack, label: "Evening snack" },
];

export function MealTypeElement({
  name,
  fullWidth,
}: {
  name: string;
  fullWidth?: boolean;
}) {
  return (
    <SelectElement
      name={name}
      label="When"
      options={options}
      fullWidth={fullWidth}
    />
  );
}
