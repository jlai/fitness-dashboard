import dayjs from "dayjs";
import { queryOptions } from "@tanstack/react-query";
import { sumBy } from "es-toolkit";

import { ONE_HOUR_IN_MILLIS } from "../cache-settings";
import {
  type DailyRollupDataPointFor,
  getDailyRollupValue,
  listDailyRollups,
} from "../datapoints";
import { buildHealthProfileQuery } from "../user";

const MILLIMETERS_PER_KILOMETER = 1_000_000;

export type LifetimeStat = "steps" | "distance" | "floors";

function dayjsFromCivilDate(date?: {
  year?: number;
  month?: number;
  day?: number;
}) {
  if (date?.year == null || date.month == null || date.day == null) {
    return undefined;
  }

  return dayjs(new Date(date.year, date.month - 1, date.day));
}

export function sumLifetimeRollup<T extends LifetimeStat>(
  dataType: T,
  rollupDataPoints: Array<DailyRollupDataPointFor<T>>,
) {
  return sumBy(rollupDataPoints, (dataPoint) => {
    if (dataType === "distance") {
      return (
        Number(
          getDailyRollupValue(
            "distance",
            dataPoint as DailyRollupDataPointFor<"distance">,
          ).millimetersSum ?? 0,
        ) / MILLIMETERS_PER_KILOMETER
      );
    }

    return Number(
      getDailyRollupValue(
        dataType as "steps" | "floors",
        dataPoint as DailyRollupDataPointFor<"steps" | "floors">,
      ).countSum ?? 0,
    );
  });
}

export function buildLifetimeStatsQuery(dataType: LifetimeStat) {
  return queryOptions({
    queryKey: ["lifetime-stats", dataType],
    queryFn: async ({ client }) => {
      const profile = await client.fetchQuery(buildHealthProfileQuery());
      const start =
        dayjsFromCivilDate(profile.membershipStartDate) ??
        dayjs().startOf("day");
      const end = dayjs().startOf("day").add(1, "day");

      const { rollupDataPoints } = await listDailyRollups(dataType, start, end, {
        aggregate: true,
      });

      return sumLifetimeRollup(dataType, rollupDataPoints);
    },
    staleTime: ONE_HOUR_IN_MILLIS,
  });
}
