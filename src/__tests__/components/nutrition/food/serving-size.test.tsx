import {
  extractServingSize,
  getConfiguredServingOptions,
  getDefaultFoodServingSize,
} from "@/components/nutrition/food/serving-size";
import type { Food } from "@/api/nutrition";

describe("extractServingSize", () => {
  it("returns undefined when no leading number", () => {
    expect(extractServingSize("x apple")).toEqual({
      quantity: undefined,
      unitName: undefined,
    });

    expect(extractServingSize("")).toEqual({
      quantity: undefined,
      unitName: undefined,
    });
  });

  describe("getConfiguredServingOptions", () => {
    const defaultUnit = { id: "serving", name: "serving", plural: "servings" };
    const otherUnit = { id: "grams", name: "gram", plural: "grams" };

    it("defaults a missing multiplier for the default serving and hides other missing multipliers", () => {
      const food: Food = {
        accessLevel: "PRIVATE",
        foodId: "template",
        name: "Template",
        calories: 50,
        defaultUnit,
        defaultServingSize: 1,
        units: ["serving", "grams"],
        servings: [
          { servingSize: 1, unit: defaultUnit },
          { servingSize: 100, unit: otherUnit },
          { servingSize: 50, multiplier: 0.05, unit: otherUnit },
        ],
      };

      expect(getConfiguredServingOptions(food)).toEqual([
        {
          amount: 1,
          servingAmount: 1,
          multiplier: 1,
          unit: defaultUnit,
        },
        {
          amount: 50,
          servingAmount: 50,
          multiplier: 0.05,
          unit: otherUnit,
        },
      ]);
    });

    it("returns the configured default serving including its multiplier", () => {
      const food: Food = {
        accessLevel: "PRIVATE",
        foodId: "template",
        name: "Template",
        calories: 50,
        defaultUnit,
        defaultServingSize: 100,
        units: ["serving"],
        servings: [{ servingSize: 100, multiplier: 0.1, unit: defaultUnit }],
      };

      expect(getDefaultFoodServingSize(food)).toEqual({
        amount: 100,
        servingAmount: 100,
        multiplier: 0.1,
        unit: defaultUnit,
      });
    });
  });

  it("parses simple serving size", () => {
    expect(extractServingSize("1 apple")).toEqual({
      quantity: 1,
      unitName: "apple",
    });
  });

  it("parses decimal serving size", () => {
    expect(extractServingSize(".5 apple")).toEqual({
      quantity: 0.5,
      unitName: "apple",
    });

    expect(extractServingSize("0.5 apple")).toEqual({
      quantity: 0.5,
      unitName: "apple",
    });

    expect(extractServingSize("10.2 grams")).toEqual({
      quantity: 10.2,
      unitName: "grams",
    });
  });
});
