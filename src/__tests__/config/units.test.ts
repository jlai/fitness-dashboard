import { SettingsDistanceUnit, SettingsWaterUnit } from "@/api/user";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
} from "@/config/units";

describe("goal unit conversion", () => {
  it("converts miles and Fitbit kilometer labels to kilometers", () => {
    expect(
      kilometersFromDistanceGoal(10, SettingsDistanceUnit.DISTANCE_UNIT_MILES),
    ).toBeCloseTo(16.0934, 3);
    expect(kilometersFromDistanceGoal(10, "miles")).toBeCloseTo(16.0934, 3);
    expect(
      kilometersFromDistanceGoal(
        8,
        SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS,
      ),
    ).toBe(8);
    expect(kilometersFromDistanceGoal(8, "kilometers")).toBe(8);
  });

  it("converts water units including Fitbit labels to milliliters", () => {
    expect(
      millilitersFromWaterGoal(10, SettingsWaterUnit.WATER_UNIT_FL_OZ),
    ).toBeCloseTo(295.735, 2);
    expect(millilitersFromWaterGoal(10, "fluid ounces")).toBeCloseTo(
      295.735,
      2,
    );
    expect(millilitersFromWaterGoal(2000, "milliliters")).toBe(2000);
    expect(
      millilitersFromWaterGoal(2000, SettingsWaterUnit.WATER_UNIT_ML),
    ).toBe(2000);
  });
});
