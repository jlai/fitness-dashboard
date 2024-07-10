"use client";

import { Autocomplete, Box, TextField } from "@mui/material";
import { useAtomValue } from "jotai";
import { SyntheticEvent, useMemo, useState } from "react";
import {
  useController,
  UseControllerProps,
  useFormContext,
} from "react-hook-form";
import { loadable } from "jotai/utils";

import { Food, FoodUnit, foodUnitsByIdAtom } from "@/api/nutrition";

export interface ServingSize {
  amount: number;
  unit: FoodUnit;
}

function formatServing(option: ServingSize | string) {
  if (typeof option === "string") {
    return option;
  } else {
    return `${option.amount} ${
      option.amount === 1 ? option.unit.name : option.unit.plural
    }`;
  }
}

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
function extractServingSize(inputValue: string) {
  const [_, numeric, unitName] =
    inputValue.match(/^(\d+(?:\.\d+)?)(?:\s+(.*))?$/) ?? [];

  const number = Number(numeric);

  return { quantity: Number.isNaN(number) ? undefined : number, unitName };
}

export function FoodServingSizeInput({
  food,
  value,
  onChange,
}: {
  food: Food | null;
  value: ServingSize | null;
  onChange: (servingSize: ServingSize | null) => void;
}) {
  const options = useServingOptions(food);
  const [inputValue, setInputValue] = useState("");

  const updateSelectedQuantity = (
    event: SyntheticEvent,
    value: string | ServingSize | null
  ) => {
    if (value && typeof value === "object" && "unit" in value) {
      onChange(value);
    }
  };

  return (
    <Box>
      <Autocomplete
        freeSolo
        value={value}
        inputValue={value ? inputValue : ""}
        onChange={updateSelectedQuantity}
        onInputChange={(event, value) => setInputValue(value)}
        loading={options === undefined}
        disabled={options && options.length === 0}
        sx={{ minWidth: "300px" }}
        options={options ?? []}
        getOptionLabel={(option) => formatServing(option)}
        renderInput={(props) => <TextField {...props} label="Qty" />}
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

export function FoodServingSizeElement({
  foodFieldName,
  ...controllerProps
}: {
  foodFieldName: string;
} & UseControllerProps) {
  const { watch } = useFormContext();
  const { field } = useController(controllerProps);

  return (
    <FoodServingSizeInput
      food={watch(foodFieldName)}
      value={field.value}
      onChange={field.onChange}
    />
  );
}
