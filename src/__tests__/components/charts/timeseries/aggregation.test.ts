import { aggregateByHour } from "@/components/charts/timeseries/aggregation";

describe("aggregateByHour", () => {
  it("keeps hourly buckets in chronological order", () => {
    const entries = [
      { dateTime: new Date(2024, 4, 7, 18, 16), value: 1 },
      { dateTime: new Date(2024, 4, 7, 8, 5), value: 2 },
      { dateTime: new Date(2024, 4, 7, 18, 40), value: 3 },
    ];

    expect(aggregateByHour(entries)).toEqual([
      { dateTime: new Date(2024, 4, 7, 8), value: 2 },
      { dateTime: new Date(2024, 4, 7, 18), value: 4 },
    ]);
  });
});
