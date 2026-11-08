import type { DailyRollupDataPointFor } from "@/api/datapoints";
import {
  buildLifetimeStatsQuery,
  sumLifetimeRollup,
} from "@/api/exercise/lifetime";

describe("buildLifetimeStatsQuery", () => {
  it("uses a separate query key for each stat", () => {
    expect(buildLifetimeStatsQuery("steps").queryKey).toEqual([
      "lifetime-stats",
      "steps",
    ]);
    expect(buildLifetimeStatsQuery("distance").queryKey).toEqual([
      "lifetime-stats",
      "distance",
    ]);
    expect(buildLifetimeStatsQuery("floors").queryKey).toEqual([
      "lifetime-stats",
      "floors",
    ]);
  });
});

describe("sumLifetimeRollup", () => {
  it("sums step counts across rollup windows", () => {
    const rollupDataPoints: Array<DailyRollupDataPointFor<"steps">> = [
      { steps: { countSum: "100" } },
      { steps: { countSum: "250" } },
    ];

    expect(sumLifetimeRollup("steps", rollupDataPoints)).toBe(350);
  });

  it("sums floor counts across rollup windows", () => {
    const rollupDataPoints: Array<DailyRollupDataPointFor<"floors">> = [
      { floors: { countSum: "12" } },
      { floors: { countSum: "3" } },
    ];

    expect(sumLifetimeRollup("floors", rollupDataPoints)).toBe(15);
  });

  it("sums distance in kilometers", () => {
    const rollupDataPoints: Array<DailyRollupDataPointFor<"distance">> = [
      { distance: { millimetersSum: "1500000" } },
      { distance: { millimetersSum: "500000" } },
    ];

    expect(sumLifetimeRollup("distance", rollupDataPoints)).toBe(2);
  });

  it("treats missing rollup values as zero", () => {
    expect(sumLifetimeRollup("steps", [{ steps: {} }])).toBe(0);
    expect(sumLifetimeRollup("distance", [{ distance: {} }])).toBe(0);
  });
});
