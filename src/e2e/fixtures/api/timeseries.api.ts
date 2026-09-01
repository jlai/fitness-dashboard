import { test as base, Page } from "@playwright/test";
import dayjs from "dayjs";

import {
  ActiveMinutesRollupByActivityLevelActivityLevel,
  type DailyRollupDataPoint,
} from "@generated/orval/fetch/google-health-api/models";

import {
  ActiveMinutesTimeSeriesValue,
  ActiveZoneMinutesTimeSeriesValue,
  HeartTimeSeriesValue,
  TimeSeriesEntry,
} from "@/api/times-series";

function civilStartTimeFromDateTime(dateTime: string) {
  const day = dayjs(dateTime);

  return {
    date: {
      year: day.year(),
      month: day.month() + 1,
      day: day.date(),
    },
  };
}

function dailyRollUpUrl(dataType: string) {
  return `**/v4/users/*/dataTypes/${dataType}/dataPoints:dailyRollUp**`;
}

export class TimeSeriesApi {
  constructor(private readonly page: Page) {}

  async setupDefaults() {
    await this.setActiveMinutesTimeSeriesResponse([]);
    await this.setActiveZoneMinutesTimeSeriesResponse([]);
    await this.setWeightTimeSeriesResponse([]);
    await this.setFatTimeSeriesResponse([]);
    await this.page.route(dailyRollUpUrl("steps"), async (route) => {
      await route.fulfill({ json: { rollupDataPoints: [] } });
    });
    await this.page.route(dailyRollUpUrl("distance"), async (route) => {
      await route.fulfill({ json: { rollupDataPoints: [] } });
    });
    await this.page.route(dailyRollUpUrl("floors"), async (route) => {
      await route.fulfill({ json: { rollupDataPoints: [] } });
    });
    await this.page.route(dailyRollUpUrl("total-calories"), async (route) => {
      await route.fulfill({ json: { rollupDataPoints: [] } });
    });
  }

  async setLifetimeRollup(
    dataType: "steps" | "distance" | "floors",
    sum: string,
  ) {
    await this.page.route(dailyRollUpUrl(dataType), async (route) => {
      const value =
        dataType === "distance"
          ? { distance: { millimetersSum: sum } }
          : dataType === "floors"
            ? { floors: { countSum: sum } }
            : { steps: { countSum: sum } };

      await route.fulfill({
        json: {
          rollupDataPoints: [
            {
              civilStartTime: civilStartTimeFromDateTime("2021-01-01"),
              ...value,
            },
          ],
        },
      });
    });
  }

  async setActivityTimeSeriesResponse(
    resource: "distance" | "floors" | "calories",
    response: ReadonlyArray<TimeSeriesEntry<string>>,
  ) {
    const dataType =
      resource === "calories"
        ? "total-calories"
        : resource === "distance"
          ? "distance"
          : "floors";

    await this.page.route(dailyRollUpUrl(dataType), async (route) => {
      await route.fulfill({
        json: {
          rollupDataPoints: response.map((entry): DailyRollupDataPoint => {
            const civilStartTime = civilStartTimeFromDateTime(entry.dateTime);

            if (resource === "distance") {
              return {
                civilStartTime,
                distance: {
                  millimetersSum: String(Number(entry.value) * 1_000_000),
                },
              };
            }

            if (resource === "floors") {
              return {
                civilStartTime,
                floors: { countSum: entry.value },
              };
            }

            return {
              civilStartTime,
              totalCalories: { kcalSum: Number(entry.value) },
            };
          }),
        },
      });
    });
  }

  async setActiveMinutesTimeSeriesResponse(
    response: ReadonlyArray<TimeSeriesEntry<ActiveMinutesTimeSeriesValue>>,
  ) {
    await this.page.route(dailyRollUpUrl("active-minutes"), async (route) => {
      await route.fulfill({
        json: {
          rollupDataPoints: response.map((entry): DailyRollupDataPoint => ({
            civilStartTime: civilStartTimeFromDateTime(entry.dateTime),
            activeMinutes: {
              activeMinutesRollupByActivityLevel: [
                {
                  activityLevel:
                    ActiveMinutesRollupByActivityLevelActivityLevel.LIGHT,
                  activeMinutesSum: String(entry.value.lightlyActiveMinutes),
                },
                {
                  activityLevel:
                    ActiveMinutesRollupByActivityLevelActivityLevel.MODERATE,
                  activeMinutesSum: String(entry.value.fairlyActiveMinutes),
                },
                {
                  activityLevel:
                    ActiveMinutesRollupByActivityLevelActivityLevel.VIGOROUS,
                  activeMinutesSum: String(entry.value.veryActiveMinutes),
                },
              ],
            },
          })),
        },
      });
    });
  }

  async setWeightTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
  ) {
    await this.page.route(dailyRollUpUrl("weight"), async (route) => {
      await route.fulfill({
        json: {
          rollupDataPoints: response.map((entry): DailyRollupDataPoint => ({
            civilStartTime: civilStartTimeFromDateTime(entry.dateTime),
            weight: {
              weightGramsAvg: Number(entry.value) * 1000,
            },
          })),
        },
      });
    });
  }

  async setFatTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<string>[]>,
  ) {
    await this.page.route(dailyRollUpUrl("body-fat"), async (route) => {
      await route.fulfill({
        json: {
          rollupDataPoints: response.map((entry): DailyRollupDataPoint => ({
            civilStartTime: civilStartTimeFromDateTime(entry.dateTime),
            bodyFat: {
              bodyFatPercentageAvg: Number(entry.value),
            },
          })),
        },
      });
    });
  }

  async setBmiTimeSeriesResponse() {
    // BMI is derived from weight + height datapoints.
  }

  async setHeartTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<HeartTimeSeriesValue>[]>,
    dateRange = { start: "*", end: "*" },
  ) {
    await this.page.route(
      `**/1/user/-/activities/heart/date/${dateRange.start}/${dateRange.end}.json`,
      async (route) => {
        await route.fulfill({
          json: { "activities-heart": response },
        });
      },
    );
  }

  async setActiveZoneMinutesTimeSeriesResponse(
    response: Readonly<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>[]>,
  ) {
    await this.page.route(
      dailyRollUpUrl("active-zone-minutes"),
      async (route) => {
        await route.fulfill({
          json: {
            rollupDataPoints: response.map((entry): DailyRollupDataPoint => ({
              civilStartTime: civilStartTimeFromDateTime(entry.dateTime),
              activeZoneMinutes: {
                sumInFatBurnHeartZone: String(
                  entry.value.fatBurnActiveZoneMinutes,
                ),
                sumInCardioHeartZone: String(
                  entry.value.cardioActiveZoneMinutes,
                ),
                sumInPeakHeartZone: String(entry.value.peakActiveZoneMinutes),
              },
            })),
          },
        });
      },
    );
  }
}

type TimeSeriesApiFixture = {
  timeSeriesApi: TimeSeriesApi;
};

export const test = base.extend<TimeSeriesApiFixture>({
  timeSeriesApi: async ({ page }, use) => {
    const api = new TimeSeriesApi(page);
    await api.setupDefaults();

    await use(api);
  },
});
