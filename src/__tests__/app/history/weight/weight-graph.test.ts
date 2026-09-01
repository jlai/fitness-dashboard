import dayjs from "dayjs";

import { leanFatMassByDate } from "@/app/history/weight/lean-fat-mass";

describe("leanFatMassByDate", () => {
  const today = dayjs("2021-02-01");

  it("joins fat percentages onto weight dates", () => {
    const result = leanFatMassByDate(
      [
        { dateTime: "2021-01-31", value: "80" },
        { dateTime: "2021-02-01", value: "78" },
      ],
      [
        { dateTime: "2021-02-01", value: "20" },
        { dateTime: "2021-01-30", value: "22" },
      ],
      today,
    );

    expect(result.totalKg).toEqual([80, 78]);
    expect(result.leanKg[0]).toBeNull();
    expect(result.fatKg[0]).toBeNull();
    expect(result.leanKg[1]).toBeCloseTo(62.4);
    expect(result.fatKg[1]).toBeCloseTo(15.6);
    expect(result.dates).toHaveLength(2);
  });

  it("stops at dates after today", () => {
    expect(
      leanFatMassByDate(
        [
          { dateTime: "2021-02-01", value: "78" },
          { dateTime: "2021-02-02", value: "77" },
        ],
        [{ dateTime: "2021-02-01", value: "20" }],
        today,
      ).totalKg,
    ).toEqual([78]);
  });
});
