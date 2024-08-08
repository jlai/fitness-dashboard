import { Trackpoint } from "@/api/activity/tcx";
import { createDistanceScale } from "@/app/history/activities/details/distances";

describe("createDistanceScale", () => {
  it("should return scaled distances for times", () => {
    const trackpoints: Array<Trackpoint> = [
      {
        dateTime: new Date("2021-01-01T12:00:00"),
        distanceMeters: 0,
      },
      {
        dateTime: new Date("2021-01-01T12:00:30"),
        distanceMeters: 20,
      },
      {
        dateTime: new Date("2021-01-01T12:01:00"),
        distanceMeters: 100,
      },
      {
        dateTime: new Date("2021-01-01T12:01:10"),
        distanceMeters: 200,
      },
    ];

    const scale = createDistanceScale(trackpoints);

    // Exact time points should match
    expect(scale(new Date("2021-01-01T12:00:00"))).toBe(0);
    expect(scale(new Date("2021-01-01T12:00:30"))).toBe(20);
    expect(scale(new Date("2021-01-01T12:01:00"))).toBe(100);
    expect(scale(new Date("2021-01-01T12:01:10"))).toBe(200);

    // In-between times should be interpolated
    expect(scale(new Date("2021-01-01T12:00:45"))).toBe(60);
    expect(scale(new Date("2021-01-01T12:01:05"))).toBe(150);
  });
});
