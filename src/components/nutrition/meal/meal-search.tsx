import { Autocomplete, ListItem, ListItemText, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { UseControllerProps, useController } from "react-hook-form";

import { Meal, buildMealsQuery } from "@/api/nutrition";

function getMealFoodNames(meal: Meal) {
  return meal.mealFoods
    .map((food) => {
      return food.brand ? `${food.name} ${food.brand}` : food.name;
    })
    .join(", ");
}

export default function SearchMeals({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: Meal | null;
  onChange: (meal: Meal | null) => void;
}) {
  const { data: meals } = useQuery(buildMealsQuery());

  const options = meals || [];

  return (
    <div className={className}>
      <Autocomplete
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
    </div>
  );
}

export function SearchMealsElement(controllerProps: UseControllerProps) {
  const { field } = useController(controllerProps);

  return <SearchMeals value={field.value} onChange={field.onChange} />;
}
