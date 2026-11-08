"use client";

import { InputAdornment, TextField } from "@mui/material";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { getGoalsAtom, type GoalWrite } from "@/storage/goals";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
  useUnits,
} from "@/config/units";

import { SettingsRow, SettingsTable } from "../common";

function GoalNumberField({
  value,
  unitLabel,
  onCommit,
}: {
  value: number | "";
  unitLabel: string;
  onCommit: (rawValue: string) => void;
}) {
  const stored = value === "" ? "" : String(value);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (draft !== null && draft === stored) {
      setDraft(null);
    }
  }, [draft, stored]);

  return (
    <TextField
      value={draft ?? stored}
      type="number"
      onChange={(event) => {
        const rawValue = event.target.value;
        setDraft(rawValue);
        onCommit(rawValue);
      }}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">{unitLabel}</InputAdornment>
          ),
        },
      }}
    />
  );
}

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
    setter: (update: GoalWrite | undefined) => void,
    unit: string,
    rawValue: string,
  ) => {
    if (rawValue === "") {
      setter(undefined);
      return;
    }

    const value = parseFloat(rawValue);
    if (Number.isFinite(value)) {
      setter({ value, unit });
    }
  };

  return (
    <>
      <SettingsRow title="Goals">
        Set goals displayed on the dashboard. This does NOT affect your Google
        Health account or app. The Google Health API currently does not allow us
        to get goals from your account, so you have to set them here.
      </SettingsRow>
      <SettingsRow
        title="Daily steps"
        action={
          <GoalNumberField
            value={stepsGoal?.value ?? ""}
            unitLabel="steps"
            onCommit={(rawValue) =>
              setNumericGoal(setStepsGoal, stepsGoal?.unit ?? "", rawValue)
            }
          />
        }
      />
      <SettingsRow
        title="Weekly steps"
        action={
          <GoalNumberField
            value={weeklyStepsGoal?.value ?? ""}
            unitLabel="steps"
            onCommit={(rawValue) =>
              setNumericGoal(
                setWeeklyStepsGoal,
                weeklyStepsGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Daily floors"
        action={
          <GoalNumberField
            value={floorsGoal?.value ?? ""}
            unitLabel="floors"
            onCommit={(rawValue) =>
              setNumericGoal(setFloorsGoal, floorsGoal?.unit ?? "", rawValue)
            }
          />
        }
      />
      <SettingsRow
        title="Weekly floors"
        action={
          <GoalNumberField
            value={weeklyFloorsGoal?.value ?? ""}
            unitLabel="floors"
            onCommit={(rawValue) =>
              setNumericGoal(
                setWeeklyFloorsGoal,
                weeklyFloorsGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Daily distance"
        action={
          <GoalNumberField
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
            unitLabel={localizedKilometersName}
            onCommit={(rawValue) =>
              setNumericGoal(setDistanceGoal, distanceUnit, rawValue)
            }
          />
        }
      />
      <SettingsRow
        title="Weekly distance"
        action={
          <GoalNumberField
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
            unitLabel={localizedKilometersName}
            onCommit={(rawValue) =>
              setNumericGoal(setWeeklyDistanceGoal, distanceUnit, rawValue)
            }
          />
        }
      />
      <SettingsRow
        title="Daily calories burned"
        action={
          <GoalNumberField
            value={caloriesOutGoal?.value ?? ""}
            unitLabel="Cal"
            onCommit={(rawValue) =>
              setNumericGoal(
                setCaloriesOutGoal,
                caloriesOutGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Weekly calories burned"
        action={
          <GoalNumberField
            value={weeklyCaloriesOutGoal?.value ?? ""}
            unitLabel="Cal"
            onCommit={(rawValue) =>
              setNumericGoal(
                setWeeklyCaloriesOutGoal,
                weeklyCaloriesOutGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Daily active minutes"
        action={
          <GoalNumberField
            value={activeMinutesGoal?.value ?? ""}
            unitLabel="mins"
            onCommit={(rawValue) =>
              setNumericGoal(
                setActiveMinutesGoal,
                activeMinutesGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Weekly active minutes"
        action={
          <GoalNumberField
            value={weeklyActiveMinutesGoal?.value ?? ""}
            unitLabel="mins"
            onCommit={(rawValue) =>
              setNumericGoal(
                setWeeklyActiveMinutesGoal,
                weeklyActiveMinutesGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Daily active zone minutes"
        action={
          <GoalNumberField
            value={activeZoneMinutesGoal?.value ?? ""}
            unitLabel="mins"
            onCommit={(rawValue) =>
              setNumericGoal(
                setActiveZoneMinutesGoal,
                activeZoneMinutesGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Weekly active zone minutes"
        action={
          <GoalNumberField
            value={weeklyActiveZoneMinutesGoal?.value ?? ""}
            unitLabel="mins"
            onCommit={(rawValue) =>
              setNumericGoal(
                setWeeklyActiveZoneMinutesGoal,
                weeklyActiveZoneMinutesGoal?.unit ?? "",
                rawValue,
              )
            }
          />
        }
      />
      <SettingsRow
        title="Daily water"
        action={
          <GoalNumberField
            value={
              waterGoal
                ? localizedWaterVolume(
                    millilitersFromWaterGoal(waterGoal.value, waterGoal.unit),
                  )
                : ""
            }
            unitLabel={localizedWaterVolumeName}
            onCommit={(rawValue) =>
              setNumericGoal(setWaterGoal, waterUnit, rawValue)
            }
          />
        }
      />
      <SettingsRow
        title="Weekly water"
        action={
          <GoalNumberField
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
            unitLabel={localizedWaterVolumeName}
            onCommit={(rawValue) =>
              setNumericGoal(setWeeklyWaterGoal, waterUnit, rawValue)
            }
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
