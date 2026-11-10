import {
  createDefaultDashboardsData,
  createDefaultClientOnlyGoalsData,
  createDefaultMealsData,
  createDefaultClientOnlyFoodsData,
  createDefaultClientOnlyFavoriteFoodsData,
  createDefaultSettingsData,
  clientOnlyFoodsStoredSchema,
  clientOnlyFavoriteFoodsStoredSchema,
  dashboardsStoredSchema,
  clientOnlyGoalsStoredSchema,
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

  it("parses empty client-only-goals/meals/client-only-foods/settings defaults", () => {
    const updateTime = "2026-01-01T00:00:00.000Z";
    expect(
      clientOnlyGoalsStoredSchema.safeParse({
        data: createDefaultClientOnlyGoalsData(),
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
      clientOnlyFoodsStoredSchema.safeParse({
        data: createDefaultClientOnlyFoodsData(),
        version: 1,
        updateTime,
      }).success,
    ).toBe(true);
    expect(
      clientOnlyFavoriteFoodsStoredSchema.safeParse({
        data: createDefaultClientOnlyFavoriteFoodsData(),
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

  it("accepts food templates without a datapoint name", () => {
    const result = clientOnlyFoodsStoredSchema.safeParse({
      data: {
        clientOnlyFoods: [
          {
            id: "123e4567-e89b-42d3-a456-426614174000",
            food: { displayName: "Oats" },
          },
        ],
      },
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects food templates with a datapoint name", () => {
    expect(
      clientOnlyFoodsStoredSchema.safeParse({
        data: {
          clientOnlyFoods: [
            {
              id: "123e4567-e89b-42d3-a456-426614174000",
              name: "users/me/dataTypes/food/dataPoints/abc",
              food: { displayName: "Oats" },
            },
          ],
        },
        version: 1,
        updateTime: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("preserves extra favorite entry properties and rejects invalid IDs", () => {
    const envelope = {
      data: {
        clientOnlyFavoriteFoods: [
          {
            food: "users/me/dataTypes/food/dataPoints/food-123",
            note: "test",
          },
        ],
      },
      version: 1,
      updateTime: "2026-01-01T00:00:00.000Z",
    };
    expect(clientOnlyFavoriteFoodsStoredSchema.parse(envelope)).toEqual(
      envelope,
    );
    expect(
      clientOnlyFavoriteFoodsStoredSchema.safeParse({
        ...envelope,
        data: { clientOnlyFavoriteFoods: [{ food: "../bad" }] },
      }).success,
    ).toBe(false);
  });
});
