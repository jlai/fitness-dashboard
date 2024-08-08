import { Trackpoint } from "@/api/activity/tcx";
import { createDistanceScale, getDistanceSplits } from "@/utils/distances";

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

describe("getDistanceSplits", () => {
  it("should split distances by kilometers", () => {
    const trackpoints: Array<Trackpoint> = [
      {
        dateTime: new Date("2021-01-01T12:00:00Z"),
        distanceMeters: 0,
      },
      {
        dateTime: new Date("2021-01-01T12:00:00Z"),
        distanceMeters: 200,
      },
      {
        dateTime: new Date("2021-01-01T12:10:00Z"),
        distanceMeters: 1000,
      },
      {
        dateTime: new Date("2021-01-01T12:15:00Z"),
        distanceMeters: 1800,
      },
      {
        dateTime: new Date("2021-01-01T12:20:00Z"),
        distanceMeters: 2000,
      },
      {
        dateTime: new Date("2021-01-01T12:26:00Z"),
        distanceMeters: 2500,
      },
    ];

    const scale = createDistanceScale(trackpoints);
    const splits = getDistanceSplits(scale, "METRIC");

    expect(splits.length).toEqual(3);

    // lap 1
    {
      const split = splits[0];
      expect(split.lap).toEqual(1);
      expect(split.incomplete).toBe(false);
      expect(split.startTime.toISOString()).toEqual("2021-01-01T12:00:00.000Z");
      expect(split.endTime.toISOString()).toEqual("2021-01-01T12:10:00.000Z");
      expect(split.distanceCoveredMeters).toEqual(1000);
      expect(split.paceMillis).toEqual(10 * 60 * 1000);
    }

    // lap 2
    {
      const split = splits[1];
      expect(split.lap).toEqual(2);
      expect(split.incomplete).toBe(false);
      expect(split.startTime.toISOString()).toEqual("2021-01-01T12:10:00.000Z");
      expect(split.endTime.toISOString()).toEqual("2021-01-01T12:20:00.000Z");
      expect(split.distanceCoveredMeters).toEqual(1000);
      expect(split.paceMillis).toEqual(10 * 60 * 1000);
    }

    // lap 3
    {
      const split = splits[2];
      expect(split.lap).toEqual(3);
      expect(split.incomplete).toBe(true);
      expect(split.startTime.toISOString()).toEqual("2021-01-01T12:20:00.000Z");
      expect(split.endTime.toISOString()).toEqual("2021-01-01T12:26:00.000Z");
      expect(split.distanceCoveredMeters).toEqual(500);
      expect(split.paceMillis).toEqual(12 * 60 * 1000);
    }
  });
});
