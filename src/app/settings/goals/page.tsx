"use client";

import { InputAdornment, TextField } from "@mui/material";
import { useAtom } from "jotai";

import { getGoalsAtom } from "@/storage/goals";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
  useUnits,
} from "@/config/units";

import { SettingsRow, SettingsTable } from "../common";

function ActivityGoalsSettings() {
  const [stepsGoal, setStepsGoal] = useAtom(getGoalsAtom("steps", "daily"));
  const [weeklyStepsGoal, setWeeklyStepsGoal] = useAtom(
    getGoalsAtom("steps", "weekly"),
  );
  const [floorsGoal, setFloorsGoal] = useAtom(getGoalsAtom("floors", "daily"));
  const [weeklyFloorsGoal, setWeeklyFloorsGoal] = useAtom(
    getGoalsAtom("floors", "weekly"),
  );
  const [distanceGoal, setDistanceGoal] = useAtom(
    getGoalsAtom("distance", "daily"),
  );
  const [weeklyDistanceGoal, setWeeklyDistanceGoal] = useAtom(
    getGoalsAtom("distance", "weekly"),
  );
  const [caloriesOutGoal, setCaloriesOutGoal] = useAtom(
    getGoalsAtom("caloriesOut", "daily"),
  );
  const [weeklyCaloriesOutGoal, setWeeklyCaloriesOutGoal] = useAtom(
    getGoalsAtom("caloriesOut", "weekly"),
  );
  const [activeMinutesGoal, setActiveMinutesGoal] = useAtom(
    getGoalsAtom("activeMinutes", "daily"),
  );
  const [weeklyActiveMinutesGoal, setWeeklyActiveMinutesGoal] = useAtom(
    getGoalsAtom("activeMinutes", "weekly"),
  );
  const [activeZoneMinutesGoal, setActiveZoneMinutesGoal] = useAtom(
    getGoalsAtom("activeZoneMinutes", "daily"),
  );
  const [weeklyActiveZoneMinutesGoal, setWeeklyActiveZoneMinutesGoal] = useAtom(
    getGoalsAtom("activeZoneMinutes", "weekly"),
  );
  const [waterGoal, setWaterGoal] = useAtom(
    getGoalsAtom("waterVolume", "daily"),
  );
  const [weeklyWaterGoal, setWeeklyWaterGoal] = useAtom(
    getGoalsAtom("waterVolume", "weekly"),
  );

  const {
    distanceUnit,
    waterUnit,
    localizedKilometers,
    localizedKilometersName,
    localizedWaterVolume,
    localizedWaterVolumeName,
  } = useUnits();

  const setNumericGoal = (
    setter: (update: { value: number; unit: string }) => void,
    unit: string,
    rawValue: string,
  ) => {
    const value = parseFloat(rawValue);
    if (Number.isFinite(value)) {
      setter({ value, unit });
    }
  };

  return (
    <>
      <SettingsRow title="Goals">
        Set goals displayed on the dashboard. This does NOT affect your Fitbit
        account or app. The Google Health API currently does not allow us to get
        goals from your account, so you have to set them here.
      </SettingsRow>
      <SettingsRow
        title="Daily steps"
        action={
          <TextField
            value={stepsGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setStepsGoal,
                stepsGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">steps</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly steps"
        action={
          <TextField
            value={weeklyStepsGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setWeeklyStepsGoal,
                weeklyStepsGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">steps</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily floors"
        action={
          <TextField
            value={floorsGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setFloorsGoal,
                floorsGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">floors</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly floors"
        action={
          <TextField
            value={weeklyFloorsGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setWeeklyFloorsGoal,
                weeklyFloorsGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">floors</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily distance"
        action={
          <TextField
            value={
              distanceGoal
                ? localizedKilometers(
                    kilometersFromDistanceGoal(
                      distanceGoal.value,
                      distanceGoal.unit,
                    ),
                  )
                : ""
            }
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setDistanceGoal({ value, unit: distanceUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedKilometersName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly distance"
        action={
          <TextField
            value={
              weeklyDistanceGoal
                ? localizedKilometers(
                    kilometersFromDistanceGoal(
                      weeklyDistanceGoal.value,
                      weeklyDistanceGoal.unit,
                    ),
                  )
                : ""
            }
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWeeklyDistanceGoal({ value, unit: distanceUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedKilometersName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily calories burned"
        action={
          <TextField
            value={caloriesOutGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setCaloriesOutGoal,
                caloriesOutGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">Cal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly calories burned"
        action={
          <TextField
            value={weeklyCaloriesOutGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setWeeklyCaloriesOutGoal,
                weeklyCaloriesOutGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">Cal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily active minutes"
        action={
          <TextField
            value={activeMinutesGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setActiveMinutesGoal,
                activeMinutesGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly active minutes"
        action={
          <TextField
            value={weeklyActiveMinutesGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setWeeklyActiveMinutesGoal,
                weeklyActiveMinutesGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily active zone minutes"
        action={
          <TextField
            value={activeZoneMinutesGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setActiveZoneMinutesGoal,
                activeZoneMinutesGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly active zone minutes"
        action={
          <TextField
            value={weeklyActiveZoneMinutesGoal?.value ?? ""}
            type="number"
            onChange={(event) =>
              setNumericGoal(
                setWeeklyActiveZoneMinutesGoal,
                weeklyActiveZoneMinutesGoal?.unit ?? "",
                event.target.value,
              )
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily water"
        action={
          <TextField
            value={
              waterGoal
                ? localizedWaterVolume(
                    millilitersFromWaterGoal(waterGoal.value, waterGoal.unit),
                  )
                : ""
            }
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWaterGoal({ value, unit: waterUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedWaterVolumeName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly water"
        action={
          <TextField
            value={
              weeklyWaterGoal
                ? localizedWaterVolume(
                    millilitersFromWaterGoal(
                      weeklyWaterGoal.value,
                      weeklyWaterGoal.unit,
                    ),
                  )
                : ""
            }
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWeeklyWaterGoal({ value, unit: waterUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedWaterVolumeName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
    </>
  );
}

export default function GoalsSettingsPage() {
  return (
    <SettingsTable>
      <ActivityGoalsSettings />
    </SettingsTable>
  );
}
