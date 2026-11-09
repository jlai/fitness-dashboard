import { QueryClient, queryOptions } from "@tanstack/react-query";
import { getDefaultStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import type { Settings } from "@generated/orval/fetch/google-health-api/models";

import * as datapoints from "@/api/datapoints";
import { buildSearchFoodsQuery } from "@/api/nutrition/search";
import { buildUserSettingsQuery } from "@/api/user";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  listDataPointsPage: jest.fn(),
}));

jest.mock("@/api/user", () => ({
  buildUserSettingsQuery: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function foodDataPoint(id: string, languageCode?: string) {
  return {
    name: `users/me/dataTypes/food/dataPoints/${id}`,
    food: { displayName: id, languageCode },
  };
}

describe("food search language filtering", () => {
  beforeEach(() => {
    getDefaultStore().set(queryClientAtom, queryClient);
  });

  afterEach(() => {
    queryClient.clear();
    jest.resetAllMocks();
  });

  it("normalizes the settings language and filters results client-side", async () => {
    jest.mocked(buildUserSettingsQuery).mockReturnValue(
      queryOptions({
        queryKey: ["user-settings"],
        queryFn: async (): Promise<Settings> => ({
          foodLanguageCode: "fr-FR",
        }),
      }),
    );
    const list = jest.mocked(datapoints.listDataPointsPage).mockResolvedValue({
      dataPoints: [
        foodDataPoint("matching", "fr_FR"),
        foodDataPoint("other-language", "en-US"),
        foodDataPoint("missing-language"),
      ],
    });

    const result = await queryClient.fetchQuery(buildSearchFoodsQuery("soup"));

    expect(buildUserSettingsQuery).toHaveBeenCalled();
    expect(list).toHaveBeenCalledWith(
      "food",
      'food.display_name = "soup"',
      undefined,
      50,
    );
    expect(result.foods.map(({ foodId }) => foodId)).toEqual(["matching"]);
  });

  it("defaults to en_US when the settings response has no food language", async () => {
    jest.mocked(buildUserSettingsQuery).mockReturnValue(
      queryOptions({
        queryKey: ["user-settings"],
        queryFn: async (): Promise<Settings> => ({}),
      }),
    );
    jest.mocked(datapoints.listDataPointsPage).mockResolvedValue({
      dataPoints: [
        foodDataPoint("default-language", "en-US"),
        foodDataPoint("other-language", "en-GB"),
        foodDataPoint("missing-language"),
      ],
    });

    const result = await queryClient.fetchQuery(buildSearchFoodsQuery("soup"));

    expect(result.foods.map(({ foodId }) => foodId)).toEqual([
      "default-language",
    ]);
  });
});
