import { DateFormats, currentTimeZone } from "@/utils/date-formats";

describe("DateFormats.formatTime", () => {
  it("formats a UTC physical timestamp in the current time zone", () => {
    const physical = "2024-05-07T15:30:00.000Z";
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: currentTimeZone(),
    }).format(new Date(physical));

    expect(DateFormats.formatTime(physical)).toBe(expected);
    expect(DateFormats.formatTime(new Date(physical))).toBe(expected);
  });
});
