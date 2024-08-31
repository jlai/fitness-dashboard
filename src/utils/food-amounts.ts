import { FoodUnit } from "@/api/nutrition";

export interface ServingSize {
  amount: number;
  unit: FoodUnit;
}

export function formatServing(option: ServingSize | string | null) {
  if (!option) {
    return "";
  }

  if (typeof option === "string") {
    return option;
  } else {
    return `${option.amount} ${
      option.amount === 1 ? option.unit.name : option.unit.plural
    }`;
  }
}

export function formatValue(value: number, digits?: number): number {
  return parseFloat(value.toFixed(Math.max(digits || 0, 0)));
}
