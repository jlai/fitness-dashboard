import {
  bmiFromWeightAndHeight,
  gramsFromLocalizedWeight,
  kilogramsFromGrams,
  kilogramsFromLocalizedWeight,
  toWeightLogs,
  type BodyFatDataPoint,
  type HeightDataPoint,
  type WeightDataPoint,
} from "@/api/body";
import { SettingsWeightUnit } from "@/api/user";

const sampleTime = {
  civilTime: {
    date: { year: 2021, month: 2, day: 1 },
    time: { hours: 8, minutes: 0, seconds: 0 },
  },
  physicalTime: "2021-02-01T15:00:00.000Z",
};

describe("weight unit conversion", () => {
  it("converts pounds to kilograms and grams", () => {
    expect(
      kilogramsFromLocalizedWeight(
        220.462,
        SettingsWeightUnit.WEIGHT_UNIT_POUNDS,
      ),
    ).toBeCloseTo(100, 5);
    expect(
      gramsFromLocalizedWeight(220.462, SettingsWeightUnit.WEIGHT_UNIT_POUNDS),
    ).toBeCloseTo(100000, 2);
  });

  it("converts grams to kilograms", () => {
    expect(kilogramsFromGrams(76204)).toBeCloseTo(76.204, 5);
  });
});

describe("bmiFromWeightAndHeight", () => {
  it("computes BMI from kg and millimeters", () => {
    expect(bmiFromWeightAndHeight(76.2, 1780)).toBeCloseTo(24.05, 1);
  });

  it("returns undefined for missing height", () => {
    expect(bmiFromWeightAndHeight(76.2, 0)).toBeUndefined();
  });
});

describe("toWeightLogs", () => {
  it("joins fat and height onto weight samples", () => {
    const weights: Array<WeightDataPoint> = [
      {
        name: "users/me/dataTypes/weight/dataPoints/1",
        weight: {
          weightGrams: 76204,
          sampleTime,
        },
      },
    ];
    const fats: Array<BodyFatDataPoint> = [
      {
        name: "users/me/dataTypes/body-fat/dataPoints/1",
        bodyFat: {
          percentage: 21,
          sampleTime,
        },
      },
    ];
    const heights: Array<HeightDataPoint> = [
      {
        name: "users/me/dataTypes/height/dataPoints/1",
        height: {
          heightMillimeters: "1780",
          sampleTime: {
            civilTime: { date: { year: 2020, month: 1, day: 1 } },
            physicalTime: "2020-01-01T00:00:00.000Z",
          },
        },
      },
    ];

    const [log] = toWeightLogs(weights, fats, heights);

    expect(log).toMatchObject({
      name: "users/me/dataTypes/weight/dataPoints/1",
      date: "2021-02-01",
      time: "08:00:00",
      weight: 76.204,
      fat: 21,
    });
    expect(log?.bmi).toBeCloseTo(24.05, 1);
  });

  it("matches the closest same-day fat sample", () => {
    const weights: Array<WeightDataPoint> = [
      {
        name: "users/me/dataTypes/weight/dataPoints/afternoon",
        weight: {
          weightGrams: 76000,
          sampleTime: {
            civilTime: {
              date: { year: 2021, month: 2, day: 1 },
              time: { hours: 12, minutes: 0, seconds: 0 },
            },
            physicalTime: "2021-02-01T19:00:00.000Z",
          },
        },
      },
    ];
    const fats: Array<BodyFatDataPoint> = [
      {
        name: "users/me/dataTypes/body-fat/dataPoints/morning",
        bodyFat: {
          percentage: 22,
          sampleTime,
        },
      },
      {
        name: "users/me/dataTypes/body-fat/dataPoints/afternoon",
        bodyFat: {
          percentage: 20,
          sampleTime: {
            civilTime: {
              date: { year: 2021, month: 2, day: 1 },
              time: { hours: 12, minutes: 0, seconds: 0 },
            },
            physicalTime: "2021-02-01T19:00:00.000Z",
          },
        },
      },
    ];

    expect(toWeightLogs(weights, fats)[0]?.fat).toBe(20);
  });
});
