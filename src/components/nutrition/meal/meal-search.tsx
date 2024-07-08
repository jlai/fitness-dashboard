import { Autocomplete, ListItem, ListItemText, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { Meal, buildMealsQuery } from "@/api/nutrition";

function getMealFoodNames(meal: Meal) {
  return meal.mealFoods
    .map((food) => {
      return food.brand ? `${food.name} ${food.brand}` : food.name;
    })
    .join(", ");
}

export default function MealSearch({
  className,
  selectedMeal,
  onSelectMeal,
}: {
  className?: string;
  selectedMeal: Meal | null;
  onSelectMeal: (meal: Meal | null) => void;
}) {
  const { data: meals } = useQuery(buildMealsQuery());

  const options = meals || [];

  return (
    <div className={className}>
      <Autocomplete
        value={selectedMeal}
        onChange={(event, value) => onSelectMeal(value)}
        disabled={meals === undefined}
        options={options}
        getOptionLabel={(meal) => meal.name}
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
