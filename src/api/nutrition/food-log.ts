import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";

import {
  DataSourceRecordingMethod,
  type NutritionLog,
  type Serving,
} from "@generated/orval/fetch/google-health-api/models";
import {
  healthUsersDataTypesDataPointsBatchDelete,
  healthUsersDataTypesDataPointsCreate,
  healthUsersDataTypesDataPointsPatch,
} from "@generated/orval/fetch/google-health-api/users/users";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";

import { getDataPointIdFromName } from "./helpers";

export interface CreateFoodLogOptions {
  nutritionLog: NutritionLog;
  day: Dayjs;
}

export interface UpdateFoodLogOptions {
  name: string;
  nutritionLog: NutritionLog;
  day: Dayjs;
}

export interface DeleteFoodLogOptions {
  name: string;
  day: Dayjs;
}

function utcOffsetDuration(day: Dayjs) {
  return `${day.utcOffset() * 60}s`;
}

export function foodResourceName(foodId: string) {
  return `users/me/dataTypes/food/dataPoints/${foodId}`;
}

export function foodMeasurementUnitResourceName(unitId: string) {
  return `users/me/dataTypes/food-measurement-unit/dataPoints/${unitId}`;
}

function nutritionLogInterval(day: Dayjs) {
  const endTime = day.add(1, "second");
  const utcOffset = utcOffsetDuration(day);

  return {
    startTime: day.toISOString(),
    endTime: endTime.toISOString(),
    startUtcOffset: utcOffset,
    endUtcOffset: utcOffsetDuration(endTime),
  };
}

export function nutritionLogServing(amount: number, unitId: string): Serving {
  return {
    amount,
    ...(unitId
      ? { foodMeasurementUnit: foodMeasurementUnitResourceName(unitId) }
      : {}),
  };
}

export function servingFromSize(
  amount: number,
  unitId: string,
  original?: Serving,
): Serving {
  const originalUnitId = getDataPointIdFromName(original?.foodMeasurementUnit);
  const foodMeasurementUnit =
    original?.foodMeasurementUnit && originalUnitId === unitId
      ? original.foodMeasurementUnit
      : unitId
        ? foodMeasurementUnitResourceName(unitId)
        : undefined;

  return {
    amount,
    ...(foodMeasurementUnit ? { foodMeasurementUnit } : {}),
  };
}

function writableServing(serving?: Serving): Serving | undefined {
  if (!serving) {
    return undefined;
  }

  return {
    amount: serving.amount,
    ...(serving.foodMeasurementUnit
      ? { foodMeasurementUnit: serving.foodMeasurementUnit }
      : {}),
  };
}

/**
 * Fields the API populates from an identified Food resource must not be sent
 * on create/update. Anonymous logs still need display name and nutrients.
 * @see https://developers.google.com/health/data-types/nutrition
 */
export function writableNutritionLog(
  log: NutritionLog,
  interval: NutritionLog["interval"],
): NutritionLog {
  const serving = writableServing(log.serving);

  if (log.food) {
    return {
      interval,
      food: log.food,
      mealType: log.mealType,
      serving,
    };
  }

  return {
    interval,
    mealType: log.mealType,
    serving,
    foodDisplayName: log.foodDisplayName,
    energy: log.energy,
    energyFromFat: log.energyFromFat,
    totalCarbohydrate: log.totalCarbohydrate,
    totalFat: log.totalFat,
    nutrients: log.nutrients,
  };
}

async function logFood(newFood: CreateFoodLogOptions) {
  const response = await healthUsersDataTypesDataPointsCreate(
    "me",
    "nutrition-log",
    {
      dataSource: {
        recordingMethod: DataSourceRecordingMethod.MANUAL,
      },
      nutritionLog: writableNutritionLog(
        newFood.nutritionLog,
        nutritionLogInterval(newFood.day),
      ),
    },
  );

  return response.data;
}

async function updateFood(updatedFood: UpdateFoodLogOptions) {
  const response = await healthUsersDataTypesDataPointsPatch(
    "me",
    "nutrition-log",
    getDataPointIdFromName(updatedFood.name),
    {
      nutritionLog: writableNutritionLog(
        updatedFood.nutritionLog,
        nutritionLogInterval(updatedFood.day),
      ),
    },
  );

  return response.data;
}

function invalidateNutritionLogQueries(
  queryClient: QueryClient,
  dates: Iterable<string>,
) {
  for (const date of dates) {
    queryClient.invalidateQueries({
      queryKey: ["datapoints", "nutrition-log", date],
    });
  }
  queryClient.invalidateQueries({
    queryKey: ["timeseries", "calories-in"],
  });
}

export function buildCreateFoodLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: logFood,
    onSuccess: (_data, variables) => {
      invalidateNutritionLogQueries(queryClient, [formatAsDate(variables.day)]);
      queryClient.invalidateQueries({
        queryKey: ["recent-foods"],
      });
    },
  });
}

export function buildCreateMultipleFoodLogsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (foods: CreateFoodLogOptions[]) => {
      for (const food of foods) {
        await logFood(food);
      }
    },
    onSuccess: (_data, variables) => {
      invalidateNutritionLogQueries(
        queryClient,
        variables.map((food) => formatAsDate(food.day)),
      );
      queryClient.invalidateQueries({
        queryKey: ["recent-foods"],
      });
    },
  });
}

export function buildUpdateFoodLogsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (updatedFoods: Array<UpdateFoodLogOptions>) => {
      for (const updatedFood of updatedFoods) {
        await updateFood(updatedFood);
      }
    },
    onSuccess: (_data, variables) => {
      invalidateNutritionLogQueries(
        queryClient,
        variables.map((foodLog) => formatAsDate(foodLog.day)),
      );
    },
  });
}

export function buildDeleteFoodLogsMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (deletedFoods: Array<DeleteFoodLogOptions>) => {
      if (deletedFoods.length === 0) {
        return;
      }

      await healthUsersDataTypesDataPointsBatchDelete("me", "nutrition-log", {
        names: deletedFoods.map((food) => food.name),
      });
    },
    onSuccess: (_data, variables) => {
      invalidateNutritionLogQueries(
        queryClient,
        variables.map((foodLog) => formatAsDate(foodLog.day)),
      );
    },
  });
}
