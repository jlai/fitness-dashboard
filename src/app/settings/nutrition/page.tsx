"use client";

import {
  InputAdornment,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import { useAtom } from "jotai";

import { NutritionalValues } from "@/api/nutrition/types";
import {
  foodLogGoalsPositionAtom,
  foodLogShowCopyIndividualButtonAtom,
  foodLogTotalsPositionAtom,
  macroGoalsAtom,
  showNutritionLabelAtom,
  useNutritionGoalsForLabelAtom,
} from "@/storage/settings";

import { SettingsRow, SettingsTable } from "../common";

function FoodSettings() {
  const [useNutritionGoalsForLabel, setUseNutritionGoalsForLabel] = useAtom(
    useNutritionGoalsForLabelAtom,
  );
  const [showNutritionLabel, setShowNutritionLabelAtom] = useAtom(
    showNutritionLabelAtom,
  );
  const [totalsPosition, setTotalsPosition] = useAtom(
    foodLogTotalsPositionAtom,
  );
  const [showCopyIndividualButton, setShowCopyIndividualButton] = useAtom(
    foodLogShowCopyIndividualButtonAtom,
  );
  const [goalsPosition, setGoalsPosition] = useAtom(foodLogGoalsPositionAtom);

  return (
    <>
      <SettingsRow
        title="Show the food totals row"
        action={
          <Select<typeof totalsPosition>
            value={totalsPosition}
            onChange={(event) => setTotalsPosition(event.target.value as any)}
          >
            <MenuItem value="top">On top</MenuItem>
            <MenuItem value="bottom">On bottom</MenuItem>
            <MenuItem value="both">Both top/bottom</MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Show the nutrition goals table"
        action={
          <Select<typeof goalsPosition>
            value={goalsPosition}
            onChange={(event) => setGoalsPosition(event.target.value as any)}
          >
            <MenuItem value="hidden">Hidden</MenuItem>
            <MenuItem value="top">On top</MenuItem>
            <MenuItem value="bottom">On bottom</MenuItem>
            <MenuItem value="both">Both top/bottom</MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Show the nutrition facts label"
        action={
          <Switch
            checked={showNutritionLabel}
            onChange={(_event, checked) => setShowNutritionLabelAtom(checked)}
          />
        }
      >
        Show the nutrition facts label in the custom food edition dialog
        details.
      </SettingsRow>
      <SettingsRow
        title="Use nutrition goals for nutrition labels"
        action={
          <Switch
            disabled={!showNutritionLabel}
            checked={useNutritionGoalsForLabel}
            onChange={(_event, checked) =>
              setUseNutritionGoalsForLabel(checked)
            }
          />
        }
      >
        Use nutrition goals for nutrition labels when calculating the % of daily
        values.
      </SettingsRow>
      <SettingsRow
        title="Show copy to clipboard button for individual values"
        action={
          <Switch
            checked={showCopyIndividualButton}
            onChange={(_event, value) => setShowCopyIndividualButton(value)}
          />
        }
      />
    </>
  );
}

function MacroGoals() {
  const [macroGoals, setMacroGoals] = useAtom(macroGoalsAtom);
  // Update one goal value
  const setMacroGoal = (key: keyof NutritionalValues, value: number) => {
    setMacroGoals({
      ...macroGoals,
      [key]: value,
    });
  };

  return (
    <>
      <SettingsRow title="Nutrition goals"></SettingsRow>
      <SettingsRow
        title="Calories"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("calories", parseInt(event.target.value))
            }
            value={macroGoals.calories}
            name="calories-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">kCal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Carbohydrates"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("carbs", parseInt(event.target.value))
            }
            value={macroGoals.carbs}
            name="carbs-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Fat"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("fat", parseInt(event.target.value))
            }
            value={macroGoals.fat}
            name="fat-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Fibers"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("fiber", parseInt(event.target.value))
            }
            value={macroGoals.fiber}
            name="fibers-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Protein"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("protein", parseInt(event.target.value))
            }
            value={macroGoals.protein}
            name="protein-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Sodium"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("sodium", parseInt(event.target.value))
            }
            value={macroGoals.sodium}
            name="sodium-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mg</InputAdornment>
                ),
              },
            }}
          />
        }
      />
    </>
  );
}

export default function NutritionSettingsPage() {
  return (
    <>
      <SettingsTable>
        <FoodSettings />
      </SettingsTable>
      <SettingsTable>
        <MacroGoals />
      </SettingsTable>
    </>
  );
}
