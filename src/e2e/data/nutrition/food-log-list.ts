import { Food } from "@/api/nutrition";

export const SCRAMBLED_EGGS: Food = {
  accessLevel: "PUBLIC" as const,
  brand: "",
  calories: 147,
  foodId: 80850,
  locale: "en_US",
  name: "Scrambled Eggs",
  unit: {
    id: 304,
    name: "serving",
    plural: "servings",
  },
  units: [304, 226, 180, 147, 389],
};

export const BREAKFAST_FOOD_LOGS_RESPONSE = {
  foods: [
    {
      isFavorite: false,
      logDate: "2021-02-01",
      logId: 1,
      loggedFood: {
        ...SCRAMBLED_EGGS,
        amount: 1,
        mealTypeId: 1,
      },
      nutritionalValues: {
        calories: 147,
        carbs: 8.52,
        fat: 9.21,
        fiber: 0.91,
        protein: 10.55,
        sodium: 339,
      },
    },
    {
      isFavorite: false,
      logDate: "2021-02-01",
      logId: 2,
      loggedFood: {
        accessLevel: "PUBLIC" as const,
        amount: 8,
        brand: "",
        calories: 113,
        foodId: 82782,
        locale: "en_US",
        mealTypeId: 1,
        name: "Orange Juice",
        unit: {
          id: 128,
          name: "fl oz",
          plural: "fl oz",
        },
        units: [
          139, 304, 209, 189, 128, 364, 349, 91, 256, 279, 401, 226, 180, 147,
          389,
        ],
      },
      nutritionalValues: {
        calories: 113,
        carbs: 27.01,
        fat: 0.68,
        fiber: 0.58,
        protein: 1.38,
        sodium: 15.03,
      },
    },
  ],
  summary: {
    calories: 260,
    carbs: 35.53,
    fat: 9.89,
    fiber: 1.49,
    protein: 11.93,
    sodium: 354.02,
    water: 0,
  },
};
