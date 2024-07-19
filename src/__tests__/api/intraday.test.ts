import dayjs from "dayjs";

import { parseIntradayDataset } from "@/api/intraday";

describe("parseIntradayDataset", () => {
  it("parses intraday datasets into dateTime entries", () => {
    const startTime = dayjs("2024-05-07T18:15:53");
    const endTime = dayjs("2024-05-07T20:11:01");

    const dataset = [
      { time: "18:16:50", value: 123 },
      { time: "19:00:15", value: 2.5 },
    ];

    const parsed = parseIntradayDataset(startTime, endTime, dataset);
    expect(parsed).toEqual([
      { dateTime: new Date("2024-05-07T18:16:50"), value: 123 },
      { dateTime: new Date("2024-05-07T19:00:15"), value: 2.5 },
    ]);
  });

  it("parses intraday datasets that cross a day boundary", () => {
    const startTime = dayjs("2024-05-07T18:15:53");
    const endTime = dayjs("2024-05-08T03:11:01");

    const dataset = [
      { time: "18:16:50", value: 123 },
      { time: "02:00:15", value: 2.5 },
    ];

    const parsed = parseIntradayDataset(startTime, endTime, dataset);
    expect(parsed).toEqual([
      { dateTime: new Date("2024-05-07T18:16:50"), value: 123 },
      { dateTime: new Date("2024-05-08T02:00:15"), value: 2.5 },
    ]);
  });
});
