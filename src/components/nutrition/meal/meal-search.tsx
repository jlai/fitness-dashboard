import { Autocomplete, ListItem, ListItemText, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { UseControllerProps, useController } from "react-hook-form";

import { Meal, buildMealsQuery } from "@/api/nutrition";
import { formatFoodName } from "@/utils/other-formats";

function getMealFoodNames(meal: Meal) {
  return meal.mealFoods
    .map((food) => formatFoodName(food.name, food.brand))
    .join(", ");
}

export default function SearchMeals({
  className,
  value,
  onChange,
  fullWidth = true,
}: {
  className?: string;
  value: Meal | null;
  onChange: (meal: Meal | null) => void;
  fullWidth?: boolean;
}) {
  const { data: meals } = useQuery(buildMealsQuery());

  const options = meals || [];

  return (
    <Autocomplete
      className={className}
      fullWidth={fullWidth}
      value={value}
      onChange={(event, value) => onChange(value)}
      disabled={meals === undefined}
      options={options}
      getOptionLabel={(meal) => meal.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(props) => <TextField label="Select a meal" {...props} />}
      renderOption={(props, option) => (
        <ListItem {...props} key={(props as any)["key"]}>
          <ListItemText
            primary={option.name}
            secondary={getMealFoodNames(option)}
          />
        </ListItem>
      )}
    />
  );
}

export function SearchMealsElement(controllerProps: UseControllerProps) {
  const { field } = useController(controllerProps);

  return <SearchMeals value={field.value} onChange={field.onChange} />;
}
