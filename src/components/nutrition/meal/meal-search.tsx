import { Autocomplete, ListItem, ListItemText, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { UseControllerProps, useController } from "react-hook-form";

import { MealSummary, buildMealsQuery } from "@/api/nutrition";

export default function SearchMeals({
  className,
  value,
  onChange,
  fullWidth = true,
  disabled = false,
}: {
  className?: string;
  value: MealSummary | null;
  onChange: (meal: MealSummary | null) => void;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  const { data: meals } = useQuery(buildMealsQuery());

  const options = meals || [];

  return (
    <Autocomplete
      className={className}
      fullWidth={fullWidth}
      value={value}
      onChange={(event, value) => onChange(value)}
      disabled={disabled || meals === undefined}
      options={options}
      getOptionLabel={(meal) => meal.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(props) => <TextField label="Select a meal" {...props} />}
      renderOption={(props, option) => {
        const { key, ...listItemProps } = props;

        return (
          <ListItem {...listItemProps} key={key}>
            <ListItemText
              primary={option.name}
              secondary={option.foodNames.join(", ")}
            />
          </ListItem>
        );
      }}
    />
  );
}

export function SearchMealsElement({
  disabled,
  ...controllerProps
}: UseControllerProps & { disabled?: boolean }) {
  const { field } = useController(controllerProps);

  return (
    <SearchMeals
      value={field.value}
      onChange={field.onChange}
      disabled={disabled}
    />
  );
}
