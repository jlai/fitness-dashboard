import dayjs from "dayjs";

import { rollupPageSize } from "@/api/datapoints";

const FIFTEEN_MINUTES = 900;
const FIVE_MINUTES = 300;
const ONE_MINUTE = 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

describe("rollupPageSize", () => {
  const start = dayjs("2024-05-07T00:00:00Z");

  it("requests one day of 15-minute distance windows", () => {
    expect(rollupPageSize("distance", "900s", start, start.add(1, "day"))).toBe(
      96,
    );
  });

  it("keeps 15-minute distance windows within 90 days", () => {
    const pageSize = rollupPageSize(
      "distance",
      "900s",
      start,
      start.add(90, "day"),
    );

    expect(pageSize * FIFTEEN_MINUTES).toBeLessThanOrEqual(
      90 * SECONDS_PER_DAY,
    );
    expect(pageSize).toBe(8640);
  });

  it("keeps 5-minute total-calories windows within 14 days", () => {
    const pageSize = rollupPageSize(
      "total-calories",
      "300s",
      start,
      start.add(1, "day"),
    );

    expect(pageSize).toBe(288);
    expect(pageSize * FIVE_MINUTES).toBeLessThanOrEqual(14 * SECONDS_PER_DAY);
  });

  it("caps 1-minute windows at the API page size", () => {
    const pageSize = rollupPageSize(
      "total-calories",
      "60s",
      start,
      start.add(14, "day"),
    );

    expect(pageSize).toBe(10000);
    expect(pageSize * ONE_MINUTE).toBeLessThanOrEqual(14 * SECONDS_PER_DAY);
  });
});
