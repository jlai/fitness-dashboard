"use client";

import {
  Autocomplete,
  AutocompleteChangeReason,
  Box,
  TextField,
} from "@mui/material";
import { useAtomValue } from "jotai";
import {
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FieldError,
  useController,
  UseControllerProps,
  useFormContext,
} from "react-hook-form";
import { loadable } from "jotai/utils";

import { Food, foodUnitsByIdAtom } from "@/api/nutrition";
import { formatServing, ServingSize } from "@/utils/food-amounts";

function useServingOptions(food: Food | null) {
  const loadingFoodUnitsById = useAtomValue(loadable(foodUnitsByIdAtom));

  return useMemo(() => {
    let options: Array<ServingSize> = [];

    if (!food) {
      return [];
    }

    if (food.servings) {
      options = food.servings.map((serving) => ({
        amount: serving.servingSize,
        unit: serving.unit,
      }));
    } else {
      if (loadingFoodUnitsById.state !== "hasData") {
        return undefined;
      }

      const foodUnitsById = loadingFoodUnitsById.data;

      for (const unitId of food.units) {
        const unit = foodUnitsById.get(unitId);
        if (unit) {
          options.push({ amount: 1, unit });
        }
      }
    }

    return options;
  }, [food, loadingFoodUnitsById]);
}

/**
 * Parse a quantity like "13 oz"
 * @fixme Currently only supports '.' for decimal separator
 */
export function extractServingSize(inputValue: string) {
  const [_, numeric, unitName] =
    inputValue.match(/^(\d*(?:\.\d+)?)(?:\s+(.*))?$/) ?? [];

  const number = numeric ? Number(numeric) : undefined;

  return { quantity: Number.isNaN(number) ? undefined : number, unitName };
}

export function FoodServingSizeInput({
  food,
  value,
  onChange,
  error,
}: {
  food: Food | null;
  value: ServingSize | null;
  onChange: (servingSize: ServingSize | null) => void;
  error?: FieldError;
}) {
  const options = useServingOptions(food);
  const [lastValue, setLastValue] = useState(value);
  const [inputValue, setInputValue] = useState(formatServing(value));

  const updateSelectedQuantity = useCallback(
    (
      event: SyntheticEvent,
      value: string | ServingSize | null,
      reason: AutocompleteChangeReason
    ) => {
      if (value && typeof value === "object" && "unit" in value) {
        onChange(value);
      }

      if (!value) {
        onChange(null);
      }
    },
    [onChange]
  );

  // If the user blurs an incomplete number, use default unit
  const handleBlur = useCallback(() => {
    const parsed = extractServingSize(inputValue);

    if (parsed.quantity && !parsed.unitName) {
      const defaultUnit = food?.defaultUnit ?? options?.[0]?.unit;

      if (defaultUnit) {
        const autoServing = { amount: parsed.quantity, unit: defaultUnit };

        onChange(autoServing);
      }
    }
  }, [inputValue, options, food, onChange]);

  // Changes to value overwrite user's inputValue
  useEffect(() => {
    if (lastValue !== value) {
      setLastValue(value);

      setInputValue(formatServing(value));
    }
  }, [value, lastValue]);

  return (
    <Box>
      <Autocomplete
        freeSolo
        value={value}
        inputValue={inputValue}
        onBlur={handleBlur}
        onChange={updateSelectedQuantity}
        onInputChange={(event, value, reason) => {
          if (reason !== "reset") {
            setInputValue(value);
          }
        }}
        loading={options === undefined}
        disabled={options && options.length === 0}
        sx={{ minWidth: "300px" }}
        options={options ?? []}
        getOptionLabel={(option) => formatServing(option)}
        renderInput={(props) => (
          <TextField
            {...props}
            label="Amount"
            error={!!error}
            helperText={error?.message ?? ""}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={`${option.amount} ${option.unit.id}`}>
            {formatServing(option)}
          </li>
        )}
        filterOptions={(options, params) => {
          const { quantity, unitName } = extractServingSize(params.inputValue);

          const filtered: Array<ServingSize> = options
            .map((option) => ({
              ...option,
              amount: quantity ?? option.amount,
            }))
            .filter((option) => {
              if (unitName) {
                return (
                  option.unit.name.startsWith(unitName) ||
                  option.unit.plural.startsWith(unitName)
                );
              }
              return true;
            });

          return filtered;
        }}
      />
    </Box>
  );
}

function validateServingSize(servingSize: ServingSize | null) {
  if (!servingSize) {
    return "No amount provided";
  }

  if (servingSize.amount <= 0) {
    return "Amount cannot be zero or negative";
  }
}

export function FoodServingSizeElement({
  foodFieldName,
  ...controllerProps
}: {
  foodFieldName: string;
} & UseControllerProps) {
  const { watch } = useFormContext();
  const { field, fieldState } = useController({
    ...controllerProps,
    rules: { validate: validateServingSize, ...controllerProps.rules },
  });

  return (
    <FoodServingSizeInput
      food={watch(foodFieldName)}
      value={field.value}
      onChange={field.onChange}
      error={fieldState.error}
    />
  );
}
