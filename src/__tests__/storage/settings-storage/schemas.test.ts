import {
  createDefaultDashboardsData,
  createDefaultGoalsData,
  createDefaultMealsData,
  createDefaultCustomFoodsData,
  createDefaultSettingsData,
  customFoodsStoredSchema,
  dashboardsStoredSchema,
  goalsStoredSchema,
  mealsStoredSchema,
  settingsStoredSchema,
  storedDataSchema,
} from "@/storage/settings-storage";
import { z } from "zod";

describe("storedDataSchema", () => {
  const schema = storedDataSchema(z.object({ value: z.number() }));

  it("accepts a valid envelope", () => {
    const result = schema.safeParse({
      data: { value: 1 },
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing data or non-finite version", () => {
    expect(
      schema.safeParse({
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        data: { value: 1 },
        version: Number.NaN,
        updateTime: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("per-key stored schemas", () => {
  it("parses default dashboards payload", () => {
    const data = createDefaultDashboardsData();
    const parsed = dashboardsStoredSchema.safeParse({
      data,
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.dashboards[0]?.name).toBe("Main");
      expect(parsed.data.data.dashboards[0]?.tiles.length).toBeGreaterThan(0);
    }
  });

  it("rejects dashboards without tiles array", () => {
    expect(
      dashboardsStoredSchema.safeParse({
        data: { dashboards: [{ id: "1", name: "Main" }] },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("parses empty goals/meals/custom-foods/settings defaults", () => {
    const updateTime = "2026-01-01T00:00:00.000Z";
    expect(
      goalsStoredSchema.safeParse({
        data: createDefaultGoalsData(),
        version: 1,
        updateTime,
      }).success,
    ).toBe(true);
    expect(
      mealsStoredSchema.safeParse({
        data: createDefaultMealsData(),
        version: 1,
        updateTime,
      }).success,
    ).toBe(true);
    expect(
      customFoodsStoredSchema.safeParse({
        data: createDefaultCustomFoodsData(),
        version: 1,
        updateTime,
      }).success,
    ).toBe(true);
    expect(
      settingsStoredSchema.safeParse({
        data: createDefaultSettingsData(),
        version: 1,
        updateTime,
      }).success,
    ).toBe(true);
  });

  it("accepts food datapoints with passthrough fields", () => {
    const result = customFoodsStoredSchema.safeParse({
      data: {
        customFoods: [
          {
            name: "users/me/dataTypes/food/dataPoints/abc",
            food: { displayName: "Oats" },
          },
        ],
      },
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects food datapoints without name", () => {
    expect(
      customFoodsStoredSchema.safeParse({
        data: { customFoods: [{ food: { displayName: "Oats" } }] },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
