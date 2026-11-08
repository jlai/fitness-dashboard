import { QueryClient } from "@tanstack/react-query";
import { NutritionLogMealType } from "@generated/orval/fetch/google-health-api/models";
import dayjs from "dayjs";

import * as datapoints from "@/api/datapoints";
import { nutritionLogFromMealFood } from "@/api/nutrition/food-log";
import { buildRecentFoodsQuery } from "@/api/nutrition/search";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  listDataPointsPage: jest.fn(),
  getDataPoint: jest.fn(),
}));

describe("recent foods", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-08T22:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("requests every page with a limit of 20 for the last seven days, newest first", async () => {
    const catalogName = "users/123456789/dataTypes/food/dataPoints/public-123";
    const anonymousName = "users/me/dataTypes/nutrition-log/dataPoints/log-123";
    const list = jest
      .mocked(datapoints.listDataPointsPage)
      .mockResolvedValueOnce({
        dataPoints: [
          {
            name: "users/me/dataTypes/nutrition-log/dataPoints/log-older",
            nutritionLog: {
              food: "users/me/dataTypes/food/dataPoints/public-123",
              interval: { startTime: "2026-11-02T12:00:00Z" },
            },
          },
        ],
        nextPageToken: "page-two",
      })
      .mockResolvedValueOnce({
        dataPoints: [
          {
            name: anonymousName,
            nutritionLog: {
              foodDisplayName: "Homemade soup",
              interval: { startTime: "2026-11-08T12:00:00Z" },
              serving: { amount: 2 },
              energy: { kcal: 200 },
              nutrients: [{ nutrient: "PROTEIN", quantity: { grams: 20 } }],
            },
          },
          {
            name: "users/me/dataTypes/nutrition-log/dataPoints/log-newer",
            nutritionLog: {
              food: catalogName,
              interval: { startTime: "2026-11-07T12:00:00Z" },
            },
          },
        ],
      });
    const getFood = jest.mocked(datapoints.getDataPoint).mockResolvedValue({
      name: catalogName,
      food: { displayName: "Catalog food", energyAvg: { kcal: 50 } },
    });

    const foods = await new QueryClient().fetchQuery(buildRecentFoodsQuery());
    const now = dayjs("2026-11-08T22:00:00Z");
    const format = "YYYY-MM-DDTHH:mm:ss";
    const filter = `nutrition_log.interval.civil_start_time >= "${now.subtract(7, "day").format(format)}" AND nutrition_log.interval.civil_start_time < "${now.format(format)}"`;
    expect(list).toHaveBeenNthCalledWith(
      1,
      "nutrition-log",
      filter,
      undefined,
      20,
    );
    expect(list).toHaveBeenNthCalledWith(
      2,
      "nutrition-log",
      filter,
      "page-two",
      20,
    );
    expect(getFood).toHaveBeenCalledTimes(1);
    expect(getFood).toHaveBeenCalledWith("food", "public-123");
    expect(foods).toMatchObject([
      {
        name: "Homemade soup",
        sourceNutritionLogName: anonymousName,
        accessLevel: "PRIVATE",
        defaultServingSize: 2,
        calories: 200,
        nutritionalValues: { protein: 20 },
      },
      { foodId: "public-123", name: "Catalog food", calories: 50 },
    ]);
    expect(
      nutritionLogFromMealFood(
        { ...foods[0], amount: 1 },
        NutritionLogMealType.LUNCH,
      ),
    ).toMatchObject({
      foodDisplayName: "Homemade soup",
      serving: { amount: 1 },
      energy: { kcal: 100 },
      nutrients: [{ nutrient: "PROTEIN", quantity: { grams: 10 } }],
    });
  });

  it("surfaces API errors and invalid food references", async () => {
    const list = jest.mocked(datapoints.listDataPointsPage);
    list.mockRejectedValueOnce(new Error("offline"));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await expect(client.fetchQuery(buildRecentFoodsQuery())).rejects.toThrow(
      "offline",
    );
    list.mockResolvedValueOnce({
      dataPoints: [
        {
          nutritionLog: {
            food: "users/me/dataTypes/food/dataPoints/../bad",
          },
        },
      ],
    });
    await expect(client.fetchQuery(buildRecentFoodsQuery())).rejects.toThrow(
      "Invalid food resource",
    );
    expect(datapoints.getDataPoint).not.toHaveBeenCalled();
  });
});
