import { buildMigrationGoals } from "@/app/settings/migration/goals";

describe("buildMigrationGoals", () => {
  it("maps daily and weekly activity goals with Google Health unit names", () => {
    expect(
      buildMigrationGoals({
        dailyActivityGoals: {
          activeMinutes: 55,
          activeZoneMinutes: 21,
          caloriesOut: 3500,
          distance: 5,
          floors: 10,
          steps: 10000,
        },
        weeklyActivityGoals: {
          activeZoneMinutes: 150,
          distance: 56.33,
          floors: 70,
          steps: 70000,
        },
      })
    ).toEqual([
      { metric: "steps", period: "daily", value: 10000 },
      { metric: "floors", period: "daily", value: 10 },
      { metric: "distance", period: "daily", value: 5, units: "kilometers" },
      {
        metric: "caloriesOut",
        period: "daily",
        value: 3500,
        units: "kilocalories",
      },
      {
        metric: "activeMinutes",
        period: "daily",
        value: 55,
        units: "minutes",
      },
      {
        metric: "activeZoneMinutes",
        period: "daily",
        value: 21,
        units: "minutes",
      },
      { metric: "steps", period: "weekly", value: 70000 },
      { metric: "floors", period: "weekly", value: 70 },
      {
        metric: "distance",
        period: "weekly",
        value: 56.33,
        units: "kilometers",
      },
      {
        metric: "activeZoneMinutes",
        period: "weekly",
        value: 150,
        units: "minutes",
      },
    ]);
  });

  it("maps water, sleep, and weight goals", () => {
    expect(
      buildMigrationGoals({
        waterGoal: 2000,
        sleepGoal: {
          minDuration: 480,
          updatedOn: "2021-01-01T00:00:00.000Z",
        },
        weightGoal: {
          goalType: "LOSE",
          startDate: "2021-01-01",
          startWeight: 80,
          weight: 70,
          weightThreshold: 0.05,
        },
      })
    ).toEqual([
      {
        metric: "waterVolume",
        period: "daily",
        value: 2000,
        units: "milliliters",
      },
      { metric: "sleep", period: "daily", value: 480, units: "minutes" },
      { metric: "weight", period: "target", value: 70, units: "kilograms" },
    ]);
  });

  it("omits missing goal values", () => {
    expect(buildMigrationGoals({})).toEqual([]);
  });
});
