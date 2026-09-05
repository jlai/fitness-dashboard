import type { Food, FoodUnit, Meal } from "@/api/nutrition";
import { prepareFoodForMigration, prepareMealForMigration } from "@/app/settings/migration/prepare";

const SERVING_UNIT: FoodUnit = {
  id: 304,
  name: "serving",
  plural: "servings",
};

const GRAM_UNIT: FoodUnit = {
  id: 226,
  name: "g",
  plural: "g",
};

const FOOD: Food = {
  accessLevel: "PRIVATE",
  foodId: 9001,
  name: "Homemade Scramble",
  calories: 147,
  units: [304, 226, 999],
};

describe("prepareFoodForMigration", () => {
  const unitsById = new Map<number, FoodUnit>([
    [SERVING_UNIT.id, SERVING_UNIT],
    [GRAM_UNIT.id, GRAM_UNIT],
  ]);

  it("removes creatorEncodedId and expands unit ids", async () => {
    const prepared = await prepareFoodForMigration(
      {
        ...FOOD,
        creatorEncodedId: "ABC123",
      } as Food,
      {
        unitsById,
        getFoodDetails: async () => {
          throw new Error("no details");
        },
      }
    );

    expect(prepared).toEqual({
      ...FOOD,
      units: [SERVING_UNIT, GRAM_UNIT],
    });
    expect(prepared).not.toHaveProperty("creatorEncodedId");
  });

  it("adds nutrient info when the food details request succeeds", async () => {
    const prepared = await prepareFoodForMigration(FOOD, {
      unitsById,
      getFoodDetails: async () => ({
        ...FOOD,
        nutritionalValues: {
          calories: 147,
          protein: 10,
        },
      }),
    });

    expect(prepared.nutritionalValues).toEqual({
      calories: 147,
      protein: 10,
    });
  });

  it("keeps existing nutrient info when the food details request fails", async () => {
    const prepared = await prepareFoodForMigration(
      {
        ...FOOD,
        nutritionalValues: { calories: 120 },
      },
      {
        unitsById,
        getFoodDetails: async () => {
          throw new Error("not found");
        },
      }
    );

    expect(prepared.nutritionalValues).toEqual({ calories: 120 });
  });
});

describe("prepareMealForMigration", () => {
  it("prepares each meal food", async () => {
    const meal: Meal = {
      id: "1001",
      name: "Breakfast Plate",
      description: "Eggs",
      mealFoods: [{ ...FOOD, amount: 1, creatorEncodedId: "ABC123" } as Meal["mealFoods"][number]],
    };

    const prepared = await prepareMealForMigration(meal, {
      unitsById: new Map([[SERVING_UNIT.id, SERVING_UNIT]]),
      getFoodDetails: async () => {
        throw new Error("no details");
      },
    });

    expect(prepared.mealFoods[0]).toEqual({
      ...FOOD,
      amount: 1,
      units: [SERVING_UNIT],
    });
    expect(prepared.mealFoods[0]).not.toHaveProperty("creatorEncodedId");
  });
});
