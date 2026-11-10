"use client";

import type { FoodTemplate } from "@/api/nutrition/food-templates";
import {
  createSettingsBlobAtom,
  type ClientOnlyFoodsData,
} from "@/storage/settings-storage";
import { clientOnlyFoodsBlobOptions } from "@/storage/settings-storage/migrations";

export type { ClientOnlyFoodsData, FoodTemplate };

export const clientOnlyFoodsAtom = createSettingsBlobAtom(
  clientOnlyFoodsBlobOptions,
);
