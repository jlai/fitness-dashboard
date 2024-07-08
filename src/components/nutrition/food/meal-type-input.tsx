import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

import { MealType } from "@/api/nutrition";

export default function MealTypeInput({
  value = MealType.Anytime,
  onSelect,
}: {
  value: MealType;
  onSelect: (value: MealType) => void;
}) {
  return (
    <FormControl>
      <InputLabel>When</InputLabel>
      <Select
        label="When"
        value={value ?? MealType.Anytime}
        onChange={(event) =>
          Number.isInteger(event.target.value) &&
          onSelect(event.target.value as MealType)
        }
        autoWidth
      >
        <MenuItem value={MealType.Anytime}>Anytime</MenuItem>
        <MenuItem value={MealType.Breakfast}>Breakfast</MenuItem>
        <MenuItem value={MealType.MorningSnack}>Morning Snack</MenuItem>
        <MenuItem value={MealType.Lunch}>Lunch</MenuItem>
        <MenuItem value={MealType.AfternoonSnack}>Afternoon Snack</MenuItem>
        <MenuItem value={MealType.EveningSnack}>Evening Snack</MenuItem>
        <MenuItem value={MealType.Dinner}>Dinner</MenuItem>
      </Select>
    </FormControl>
  );
}
