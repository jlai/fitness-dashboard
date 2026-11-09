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

export function getDefaultFoodServingSize(food: Food): ServingSize | null {
  const defaultAmount = food.defaultServingSize ?? 1;
  const defaultUnit = food.defaultUnit ?? food.unit;
  const configuredDefault = getConfiguredServingOptions(food).find(
    (serving) =>
      serving.unit.id === defaultUnit?.id &&
      serving.servingAmount === defaultAmount,
  );

  if (configuredDefault) {
    return configuredDefault;
  }

  const unit = defaultUnit ?? food.servings?.[0]?.unit;
  return unit ? { amount: defaultAmount, unit } : null;
}

export function getConfiguredServingOptions(food: Food): Array<ServingSize> {
  return (
    food.servings?.flatMap((serving) => {
      // Servings without a unit id can't be logged
      if (!serving.unit.id) {
        return [];
      }

      const isDefaultServing =
        serving.unit.id === (food.defaultUnit ?? food.unit)?.id &&
        serving.servingSize === (food.defaultServingSize ?? 1);
      const multiplier =
        serving.multiplier ?? (isDefaultServing ? 1 : undefined);

      if (food.accessLevel === "PRIVATE" && multiplier === undefined) {
        return [];
      }

      return [
        {
          amount: serving.servingSize,
          servingAmount: serving.servingSize,
          multiplier,
          unit: serving.unit,
        },
      ];
    }) ?? []
  );
}

function useServingOptions(food: Food | null) {
  const loadingFoodUnitsById = useAtomValue(loadable(foodUnitsByIdAtom));

  return useMemo(() => {
    let options: Array<ServingSize> = [];

    if (!food) {
      return [];
    }

    if (food.servings) {
      options = getConfiguredServingOptions(food);
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
  label = "Amount",
  options: optionsOverride,
}: {
  food: Food | null;
  value: ServingSize | null;
  onChange: (servingSize: ServingSize | null) => void;
  error?: FieldError;
  label?: string;
  /** Use these options instead of deriving them from the food */
  options?: Array<ServingSize>;
}) {
  const foodOptions = useServingOptions(food);
  const options = optionsOverride ?? foodOptions;
  const [lastValue, setLastValue] = useState(value);
  const [inputValue, setInputValue] = useState(formatServing(value));

  const updateSelectedQuantity = useCallback(
    (
      event: SyntheticEvent,
      value: string | ServingSize | null,
      reason: AutocompleteChangeReason,
    ) => {
      if (value && typeof value === "object" && "unit" in value) {
        onChange(value);
      }

      if (!value) {
        onChange(null);
      }
    },
    [onChange],
  );

  // If the user blurs an incomplete number, use default unit
  const handleBlur = useCallback(() => {
    const parsed = extractServingSize(inputValue);

    if (parsed.quantity && !parsed.unitName) {
      const defaultUnit = food?.defaultUnit ?? options?.[0]?.unit;

      if (defaultUnit) {
        const defaultServing =
          options?.find(
            (option) =>
              option.unit.id === defaultUnit.id &&
              option.servingAmount === food?.defaultServingSize,
          ) ?? options?.find((option) => option.unit.id === defaultUnit.id);
        const autoServing = {
          ...defaultServing,
          amount: parsed.quantity,
          unit: defaultUnit,
        };

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
            label={label}
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
