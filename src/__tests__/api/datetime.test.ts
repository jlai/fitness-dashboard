import dayjs from "dayjs";

import { physicalRangeForLocalDay } from "@/api/datetime";

describe("physicalRangeForLocalDay", () => {
  it("maps a local civil day to UTC midnight-to-midnight in the browser timezone", () => {
    const day = dayjs("2024-05-07T15:30:00");
    const { start, end } = physicalRangeForLocalDay(day);

    const localMidnight = dayjs("2024-05-07T15:30:00").startOf("day");
    const nextLocalMidnight = localMidnight.add(1, "day");

    expect(start.toISOString()).toBe(localMidnight.toISOString());
    expect(end.toISOString()).toBe(nextLocalMidnight.toISOString());
  });

  it("uses civil year/month/day, not the time-of-day on the input", () => {
    const morning = physicalRangeForLocalDay(dayjs("2024-05-07T00:05:00"));
    const evening = physicalRangeForLocalDay(dayjs("2024-05-07T23:55:00"));

    expect(morning.start.toISOString()).toBe(evening.start.toISOString());
    expect(morning.end.toISOString()).toBe(evening.end.toISOString());
  });
});
