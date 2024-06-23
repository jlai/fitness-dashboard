"use client";

import { Autocomplete, Box, TextField } from "@mui/material";
import { useAtomValue } from "jotai";
import { SyntheticEvent, useMemo, useState } from "react";

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
  const foodUnitsById = useAtomValue(foodUnitsByIdAtom);

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
      for (const unitId of food.units) {
        const unit = foodUnitsById.get(unitId);
        if (unit) {
          options.push({ amount: 1, unit });
        }
      }
    }

    return options;
  }, [food, foodUnitsById]);
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

export function FoodQuantityInput({
  food,
  servingSize,
  onServingSizeChange,
}: {
  food: Food | null;
  servingSize: ServingSize | null;
  onServingSizeChange: (servingSize: ServingSize) => void;
}) {
  const options = useServingOptions(food);
  const [inputValue, setInputValue] = useState("");

  const updateSelectedQuantity = (
    event: SyntheticEvent,
    value: string | ServingSize | null
  ) => {
    if (value && typeof value === "object" && "unit" in value) {
      onServingSizeChange(value);
    }
  };

  return (
    <Box>
      <Autocomplete
        freeSolo
        value={servingSize}
        inputValue={inputValue}
        onChange={updateSelectedQuantity}
        onInputChange={(event, value) => setInputValue(value)}
        disabled={options.length === 0}
        sx={{ minWidth: "300px" }}
        options={options}
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
