import dayjs from "dayjs";

import { ActiveMinutesRollupByActivityLevelActivityLevel } from "@generated/orval/fetch/google-health-api/models";

import type { DailyRollupDataPointFor } from "@/api/datapoints";
import {
  TIME_SERIES_CONFIGS,
  getTimeSeriesValueForDay,
  type ActiveMinutesTimeSeriesValue,
} from "@/api/times-series";

describe("TIME_SERIES_CONFIGS active-minutes", () => {
  it("maps light/moderate/vigorous rollups to active minutes", () => {
    const mapValue = TIME_SERIES_CONFIGS["active-minutes"].mapValue as (
      dataPoint: DailyRollupDataPointFor<"active-minutes">,
    ) => ActiveMinutesTimeSeriesValue;

    expect(
      mapValue({
        activeMinutes: {
          activeMinutesRollupByActivityLevel: [
            {
              activityLevel:
                ActiveMinutesRollupByActivityLevelActivityLevel.LIGHT,
              activeMinutesSum: "20",
            },
            {
              activityLevel:
                ActiveMinutesRollupByActivityLevelActivityLevel.MODERATE,
              activeMinutesSum: "10",
            },
            {
              activityLevel:
                ActiveMinutesRollupByActivityLevelActivityLevel.VIGOROUS,
              activeMinutesSum: "5",
            },
          ],
        },
      }),
    ).toEqual({
      lightlyActiveMinutes: 20,
      fairlyActiveMinutes: 10,
      veryActiveMinutes: 5,
      activeMinutes: 15,
    });
  });
});

describe("getTimeSeriesValueForDay", () => {
  it("returns the value for the matching civil day", () => {
    const day = dayjs("2021-02-01T10:00:00-07:00");

    expect(
      getTimeSeriesValueForDay(
        [
          { dateTime: "2021-01-31", value: "1" },
          { dateTime: "2021-02-01", value: "2" },
          { dateTime: "2021-02-02", value: "3" },
        ],
        day,
      ),
    ).toBe("2");
  });

  it("returns undefined when the day is missing", () => {
    expect(
      getTimeSeriesValueForDay(
        [{ dateTime: "2021-02-01", value: "2" }],
        dayjs("2021-02-03"),
      ),
    ).toBeUndefined();
  });
});
