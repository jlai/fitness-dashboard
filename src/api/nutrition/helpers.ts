import {
  FoodAccessLevel as HealthFoodAccessLevel,
  type FoodServing as HealthFoodServing,
  NutrientQuantityNutrient,
  type NutrientQuantity,
  NutritionLogMealType,
  type NutritionLog,
} from "@generated/orval/fetch/google-health-api/models";
import dayjs from "dayjs";

import type { DataPointFor } from "../datapoints";
import { getDataPoint, getDataPointValue } from "../datapoints";

import {
  MealType,
  type Food,
  type FoodAccessLevel,
  type FoodLogSummary,
  type FoodUnit,
  type NutritionalValues,
  type Serving,
} from "./types";

export type { NutritionLog };

export type FoodDataPoint = DataPointFor<"food">;
export type FoodMeasurementUnitDataPoint =
  DataPointFor<"food-measurement-unit">;
export type NutritionLogDataPoint = DataPointFor<"nutrition-log">;

const GRAMS_TO_MILLIGRAMS = 1000;

type NutrientMapping = {
  field: keyof NutritionalValues;
  toFitbit: (grams: number) => number;
};

function grams(value: number) {
  return value;
}

function milligrams(value: number) {
  return value * GRAMS_TO_MILLIGRAMS;
}

const NUTRIENT_MAPPINGS: Partial<
  Record<NutrientQuantityNutrient, NutrientMapping | Array<NutrientMapping>>
> = {
  [NutrientQuantityNutrient.BIOTIN]: { field: "biotin", toFitbit: milligrams },
  [NutrientQuantityNutrient.CALCIUM]: {
    field: "calcium",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.CARBOHYDRATES]: [
    { field: "carbs", toFitbit: grams },
    { field: "totalCarbohydrate", toFitbit: grams },
  ],
  [NutrientQuantityNutrient.CHOLESTEROL]: {
    field: "cholesterol",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.COPPER]: { field: "copper", toFitbit: milligrams },
  [NutrientQuantityNutrient.DIETARY_FIBER]: [
    { field: "fiber", toFitbit: grams },
    { field: "dietaryFiber", toFitbit: grams },
  ],
  [NutrientQuantityNutrient.FOLIC_ACID]: {
    field: "folicAcid",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.IODINE]: { field: "iodine", toFitbit: milligrams },
  [NutrientQuantityNutrient.IRON]: { field: "iron", toFitbit: milligrams },
  [NutrientQuantityNutrient.MAGNESIUM]: {
    field: "magnesium",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.NIACIN]: { field: "niacin", toFitbit: milligrams },
  [NutrientQuantityNutrient.PANTOTHENIC_ACID]: {
    field: "pantothenicAcid",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.PHOSPHORUS]: {
    field: "phosphorus",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.POTASSIUM]: {
    field: "potassium",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.PROTEIN]: { field: "protein", toFitbit: grams },
  [NutrientQuantityNutrient.RIBOFLAVIN]: {
    field: "riboflavin",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.SATURATED_FAT]: {
    field: "saturatedFat",
    toFitbit: grams,
  },
  [NutrientQuantityNutrient.SODIUM]: { field: "sodium", toFitbit: milligrams },
  [NutrientQuantityNutrient.SUGAR]: { field: "sugars", toFitbit: grams },
  [NutrientQuantityNutrient.THIAMIN]: {
    field: "thiamin",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.TRANS_FAT]: { field: "transFat", toFitbit: grams },
  [NutrientQuantityNutrient.VITAMIN_A]: {
    field: "vitaminA",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.VITAMIN_B12]: {
    field: "vitaminB12",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.VITAMIN_B6]: {
    field: "vitaminB6",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.VITAMIN_C]: {
    field: "vitaminC",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.VITAMIN_D]: {
    field: "vitaminD",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.VITAMIN_E]: {
    field: "vitaminE",
    toFitbit: milligrams,
  },
  [NutrientQuantityNutrient.ZINC]: { field: "zinc", toFitbit: milligrams },
};

export function getDataPointIdFromName(resourceName?: string) {
  if (!resourceName) {
    return "";
  }

  const segments = resourceName.split("/");
  return segments[segments.length - 1] || resourceName;
}

export function getFoodDataPointId(dataPoint: FoodDataPoint) {
  return getDataPointIdFromName(dataPoint.name);
}

export function getFoodMeasurementUnitDataPointId(
  dataPoint: FoodMeasurementUnitDataPoint,
) {
  return getDataPointIdFromName(dataPoint.name);
}

export function mapFoodMeasurementUnit(
  dataPoint: FoodMeasurementUnitDataPoint,
): FoodUnit {
  const unit = getDataPointValue("food-measurement-unit", dataPoint);
  const name = unit.displayName ?? "";

  return {
    id: getDataPointIdFromName(dataPoint.name),
    name,
    plural: unit.pluralDisplayName ?? name,
  };
}

type ServingUnitRef = {
  foodMeasurementUnit?: string;
  foodMeasurementUnitDisplayName?: string;
};

function servingNeedsUnitLookup(serving?: ServingUnitRef) {
  return Boolean(
    serving?.foodMeasurementUnit && !serving.foodMeasurementUnitDisplayName,
  );
}

const foodMeasurementUnitCache = new Map<string, FoodUnit | undefined>();

export async function lookupFoodMeasurementUnits(
  resourceNames: Iterable<string | undefined>,
): Promise<Map<string, FoodUnit>> {
  const uniqueNames = [
    ...new Set(
      [...resourceNames].filter((name): name is string => Boolean(name)),
    ),
  ];

  await Promise.all(
    uniqueNames.map(async (resourceName) => {
      if (foodMeasurementUnitCache.has(resourceName)) {
        return;
      }

      try {
        const dataPoint = await getDataPoint(
          "food-measurement-unit",
          getDataPointIdFromName(resourceName),
        );
        foodMeasurementUnitCache.set(
          resourceName,
          mapFoodMeasurementUnit(dataPoint),
        );
      } catch {
        // Some catalog units are not individually fetchable; fall back to the
        // resource name when mapping servings.
        foodMeasurementUnitCache.set(resourceName, undefined);
      }
    }),
  );

  return new Map(
    uniqueNames.flatMap((resourceName) => {
      const unit = foodMeasurementUnitCache.get(resourceName);
      return unit ? [[resourceName, unit] as const] : [];
    }),
  );
}

function mapFoodServing(
  serving: HealthFoodServing,
  unitsByResourceName?: Map<string, FoodUnit>,
): Serving {
  const lookedUp = serving.foodMeasurementUnit
    ? unitsByResourceName?.get(serving.foodMeasurementUnit)
    : undefined;

  if (lookedUp && servingNeedsUnitLookup(serving)) {
    return {
      multiplier: serving.multiplier ?? 1,
      servingSize: serving.amount ?? 1,
      unit: lookedUp,
    };
  }

  const name =
    serving.foodMeasurementUnitDisplayName ?? lookedUp?.name ?? "";

  return {
    multiplier: serving.multiplier ?? 1,
    servingSize: serving.amount ?? 1,
    unit: {
      id: lookedUp?.id ?? getDataPointIdFromName(serving.foodMeasurementUnit),
      name,
      plural:
        serving.foodMeasurementUnitDisplayNamePlural ??
        lookedUp?.plural ??
        name,
    },
  };
}

function mapAccessLevel(accessLevel?: HealthFoodAccessLevel): FoodAccessLevel {
  return accessLevel === HealthFoodAccessLevel.FOOD_ACCESS_LEVEL_PRIVATE
    ? "PRIVATE"
    : "PUBLIC";
}

export function mapNutrientQuantities(
  nutrients?: NutrientQuantity[],
): NutritionalValues | undefined {
  if (!nutrients?.length) {
    return undefined;
  }

  const values: NutritionalValues = {};

  for (const nutrient of nutrients) {
    if (!nutrient.nutrient || nutrient.quantity?.grams == null) {
      continue;
    }

    const mapping = NUTRIENT_MAPPINGS[nutrient.nutrient];
    if (!mapping) {
      continue;
    }

    const mappings = Array.isArray(mapping) ? mapping : [mapping];
    for (const { field, toFitbit } of mappings) {
      values[field] = toFitbit(nutrient.quantity.grams);
    }
  }

  return Object.keys(values).length > 0 ? values : undefined;
}

export function mapFoodDataPoint(
  dataPoint: FoodDataPoint,
  unitsByResourceName?: Map<string, FoodUnit>,
): Food {
  const food = getDataPointValue("food", dataPoint);
  const defaultServing = food.defaultServing
    ? mapFoodServing(food.defaultServing, unitsByResourceName)
    : undefined;
  const servings = food.servings?.map((serving) =>
    mapFoodServing(serving, unitsByResourceName),
  );
  const nutritionalValues: NutritionalValues = {
    ...mapNutrientQuantities(food.nutrients),
    ...(food.energyAvg?.kcal != null ? { calories: food.energyAvg.kcal } : {}),
    ...(food.energyFromFat?.kcal != null
      ? { caloriesFromFat: food.energyFromFat.kcal }
      : {}),
    ...(food.totalCarbohydrate?.grams != null
      ? {
          totalCarbohydrate: food.totalCarbohydrate.grams,
          carbs: food.totalCarbohydrate.grams,
        }
      : {}),
    ...(food.totalFat?.grams != null
      ? { totalFat: food.totalFat.grams, fat: food.totalFat.grams }
      : {}),
  };

  return {
    accessLevel: mapAccessLevel(food.accessLevel),
    foodId: getDataPointIdFromName(dataPoint.name),
    name: food.displayName ?? "",
    brand: food.brand,
    locale: food.languageCode,
    calories: food.energyAvg?.kcal ?? 0,
    servings,
    defaultUnit: defaultServing?.unit,
    defaultServingSize: defaultServing?.servingSize,
    unit: defaultServing?.unit,
    units: [...new Set((servings ?? []).map((serving) => serving.unit.id))],
    nutritionalValues:
      Object.keys(nutritionalValues).length > 0 ? nutritionalValues : undefined,
  };
}

const NUTRITION_LOG_MEAL_TYPES: Record<NutritionLogMealType, MealType> = {
  [NutritionLogMealType.MEAL_TYPE_UNSPECIFIED]: MealType.Anytime,
  [NutritionLogMealType.BEFORE_BREAKFAST]: MealType.Anytime,
  [NutritionLogMealType.BREAKFAST]: MealType.Breakfast,
  [NutritionLogMealType.BEFORE_LUNCH]: MealType.MorningSnack,
  [NutritionLogMealType.LUNCH]: MealType.Lunch,
  [NutritionLogMealType.BEFORE_DINNER]: MealType.AfternoonSnack,
  [NutritionLogMealType.DINNER]: MealType.Dinner,
  [NutritionLogMealType.AFTER_DINNER]: MealType.EveningSnack,
  [NutritionLogMealType.SNACK]: MealType.Anytime,
  [NutritionLogMealType.ANYTIME]: MealType.Anytime,
};

export function mapNutritionLogMealType(
  mealType?: NutritionLogMealType,
): MealType {
  if (!mealType) {
    return MealType.Anytime;
  }

  return NUTRITION_LOG_MEAL_TYPES[mealType] ?? MealType.Anytime;
}

export function toNutritionLogMealType(
  mealType: MealType,
): NutritionLogMealType {
  switch (mealType) {
    case MealType.Breakfast:
      return NutritionLogMealType.BREAKFAST;
    case MealType.MorningSnack:
      return NutritionLogMealType.BEFORE_LUNCH;
    case MealType.Lunch:
      return NutritionLogMealType.LUNCH;
    case MealType.AfternoonSnack:
      return NutritionLogMealType.BEFORE_DINNER;
    case MealType.Dinner:
      return NutritionLogMealType.DINNER;
    case MealType.EveningSnack:
      return NutritionLogMealType.AFTER_DINNER;
    case MealType.Anytime:
    default:
      return NutritionLogMealType.ANYTIME;
  }
}

export function nutritionLogDay(log: NutritionLog) {
  const date = log.interval?.civilStartTime?.date;
  if (date?.year && date?.month && date?.day) {
    return dayjs(
      `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
    );
  }

  if (log.interval?.startTime) {
    return dayjs(log.interval.startTime);
  }

  return dayjs();
}

export function nutritionLogMacros(log: NutritionLog): NutritionalValues {
  return {
    ...mapNutrientQuantities(log.nutrients),
    ...(log.energy?.kcal != null ? { calories: log.energy.kcal } : {}),
    ...(log.energyFromFat?.kcal != null
      ? { caloriesFromFat: log.energyFromFat.kcal }
      : {}),
    ...(log.totalCarbohydrate?.grams != null
      ? {
          totalCarbohydrate: log.totalCarbohydrate.grams,
          carbs: log.totalCarbohydrate.grams,
        }
      : {}),
    ...(log.totalFat?.grams != null
      ? { totalFat: log.totalFat.grams, fat: log.totalFat.grams }
      : {}),
  };
}

export function nutritionLogServingUnit(log: NutritionLog): FoodUnit | undefined {
  const serving = log.serving;
  const lookedUp = serving?.foodMeasurementUnit
    ? foodMeasurementUnitCache.get(serving.foodMeasurementUnit)
    : undefined;
  const name = serving?.foodMeasurementUnitDisplayName ?? lookedUp?.name;

  if (!name && !serving?.foodMeasurementUnit) {
    return undefined;
  }

  return {
    id: lookedUp?.id ?? getDataPointIdFromName(serving?.foodMeasurementUnit),
    name: name ?? "",
    plural: lookedUp?.plural ?? name ?? "",
  };
}

export function foodFromNutritionLog(log: NutritionLog): Food {
  const unit = nutritionLogServingUnit(log);

  return {
    accessLevel: "PUBLIC",
    foodId: getDataPointIdFromName(log.food),
    name: log.foodDisplayName ?? "",
    calories: log.energy?.kcal ?? 0,
    defaultUnit: unit,
    defaultServingSize: log.serving?.amount ?? 1,
    unit,
    units: unit ? [unit.id] : [],
    servings: unit
      ? [
          {
            multiplier: 1,
            servingSize: log.serving?.amount ?? 1,
            unit,
          },
        ]
      : undefined,
    nutritionalValues: nutritionLogMacros(log),
  };
}

function foodServingUnitNamesNeedingLookup(
  dataPoints: FoodDataPoint[],
): string[] {
  const names: string[] = [];

  for (const dataPoint of dataPoints) {
    const food = getDataPointValue("food", dataPoint);
    for (const serving of [food.defaultServing, ...(food.servings ?? [])]) {
      if (
        serving?.foodMeasurementUnit &&
        !serving.foodMeasurementUnitDisplayName
      ) {
        names.push(serving.foodMeasurementUnit);
      }
    }
  }

  return names;
}

function nutritionLogServingUnitNamesNeedingLookup(
  dataPoints: NutritionLogDataPoint[],
): string[] {
  const names: string[] = [];

  for (const dataPoint of dataPoints) {
    const serving = getDataPointValue("nutrition-log", dataPoint).serving;
    if (
      serving?.foodMeasurementUnit &&
      !serving.foodMeasurementUnitDisplayName
    ) {
      names.push(serving.foodMeasurementUnit);
    }
  }

  return names;
}

export async function mapFoodDataPoints(
  dataPoints: FoodDataPoint[],
): Promise<Food[]> {
  const unitsByResourceName = await lookupFoodMeasurementUnits(
    foodServingUnitNamesNeedingLookup(dataPoints),
  );

  return dataPoints.map((dataPoint) =>
    mapFoodDataPoint(dataPoint, unitsByResourceName),
  );
}

export async function resolveNutritionLogServingUnits(
  dataPoints: NutritionLogDataPoint[],
): Promise<NutritionLogDataPoint[]> {
  const unitsByResourceName = await lookupFoodMeasurementUnits(
    nutritionLogServingUnitNamesNeedingLookup(dataPoints),
  );

  return dataPoints.map((dataPoint) => {
    const serving = dataPoint.nutritionLog?.serving;
    if (
      !serving?.foodMeasurementUnit ||
      serving.foodMeasurementUnitDisplayName
    ) {
      return dataPoint;
    }

    const unit = unitsByResourceName.get(serving.foodMeasurementUnit);
    if (!unit) {
      return dataPoint;
    }

    return {
      ...dataPoint,
      nutritionLog: {
        ...dataPoint.nutritionLog,
        serving: {
          ...serving,
          foodMeasurementUnitDisplayName: unit.name,
        },
      },
    };
  });
}

export function summarizeNutritionLogs(
  dataPoints: NutritionLogDataPoint[],
): FoodLogSummary {
  const summary: FoodLogSummary = {
    calories: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    protein: 0,
    sodium: 0,
    water: 0,
  };

  for (const dataPoint of dataPoints) {
    const values = nutritionLogMacros(dataPoint.nutritionLog);
    summary.calories += values.calories ?? 0;
    summary.carbs += values.carbs ?? 0;
    summary.fat += values.fat ?? 0;
    summary.fiber += values.fiber ?? 0;
    summary.protein += values.protein ?? 0;
    summary.sodium += values.sodium ?? 0;
  }

  return summary;
}
