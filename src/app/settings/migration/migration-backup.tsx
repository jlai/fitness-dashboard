"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Paper, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { buildActivityGoalsQuery } from "@/api/activity/goals";
import { hasTokenScope } from "@/api/auth";
import { buildGetBodyWeightGoalQuery } from "@/api/body";
import {
  Food,
  Meal,
  buildCustomFoodsQuery,
  buildFoodUnitsQuery,
  buildMealsQuery,
  buildWaterGoalQuery,
} from "@/api/nutrition";
import { buildGetFoodQuery } from "@/api/nutrition/foods";
import { buildGetSleepGoalQuery } from "@/api/sleep";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import {
  saveCustomFoods,
  saveGoals,
  saveMeals,
  type MigrationGoal,
} from "@/storage/db/fitbitmigrationdb";
import { formatFoodName } from "@/utils/other-formats";

import { buildMigrationGoals, goalRowId } from "./goals";
import { prepareMigrationBackup } from "./prepare";
import {
  MIGRATION_JSON_FILENAME,
  buildMigrationBackupDocument,
  stringifyMigrationBackup,
} from "./json";

const customFoodColumns: Array<GridColDef<Food>> = [
  { field: "name", headerName: "Food", flex: 2 },
  { field: "brand", headerName: "Brand", flex: 1 },
  { field: "calories", headerName: "Calories", type: "number", width: 110 },
];

const mealColumns: Array<GridColDef<Meal>> = [
  { field: "name", headerName: "Meal", flex: 2 },
  { field: "description", headerName: "Description", flex: 2 },
  {
    field: "mealFoods",
    headerName: "Foods",
    flex: 3,
    valueGetter: (_value, row) =>
      row.mealFoods
        .map((food) => formatFoodName(food.name, food.brand))
        .join(", "),
  },
];

const goalColumns: Array<GridColDef<MigrationGoal>> = [
  { field: "metric", headerName: "Metric", flex: 2 },
  { field: "period", headerName: "Period", flex: 1 },
  { field: "value", headerName: "Value", flex: 1 },
  { field: "units", headerName: "Units", flex: 1 },
];

function BackupSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper className="p-4 mb-4">
      <Typography variant="h5" className="mb-4">
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function MigrationBackup() {
  const queryClient = useQueryClient();
  const { data: customFoods, isLoading: customFoodsLoading } = useQuery(
    buildCustomFoodsQuery()
  );
  const { data: meals, isLoading: mealsLoading } = useQuery(buildMealsQuery());

  const [
    { data: dailyActivityGoals, isLoading: dailyActivityGoalsLoading },
    { data: weeklyActivityGoals, isLoading: weeklyActivityGoalsLoading },
    { data: waterGoal, isLoading: waterGoalLoading },
    { data: sleepGoal, isLoading: sleepGoalLoading },
    { data: weightGoal, isLoading: weightGoalLoading },
  ] = useQueries({
    queries: [
      {
        ...buildActivityGoalsQuery("daily"),
        enabled: hasTokenScope("act"),
      },
      {
        ...buildActivityGoalsQuery("weekly"),
        enabled: hasTokenScope("act"),
      },
      {
        ...buildWaterGoalQuery(),
        enabled: hasTokenScope("nut"),
      },
      {
        ...buildGetSleepGoalQuery(),
        enabled: hasTokenScope("sle"),
      },
      {
        ...buildGetBodyWeightGoalQuery(),
        enabled: hasTokenScope("wei"),
      },
    ],
  });

  const goals = useMemo(
    () =>
      buildMigrationGoals({
        dailyActivityGoals,
        weeklyActivityGoals,
        waterGoal,
        sleepGoal,
        weightGoal,
      }),
    [dailyActivityGoals, weeklyActivityGoals, waterGoal, sleepGoal, weightGoal]
  );

  const goalsLoading =
    dailyActivityGoalsLoading ||
    weeklyActivityGoalsLoading ||
    waterGoalLoading ||
    sleepGoalLoading ||
    weightGoalLoading;

  const [selectedFoodIds, setSelectedFoodIds] = useState<Array<number>>([]);
  const [selectedMealIds, setSelectedMealIds] = useState<Array<string>>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<Array<string>>([]);
  const [foodSelectionReady, setFoodSelectionReady] = useState(false);
  const [mealSelectionReady, setMealSelectionReady] = useState(false);
  const [goalSelectionReady, setGoalSelectionReady] = useState(false);

  useEffect(() => {
    if (customFoods !== undefined && !foodSelectionReady) {
      setSelectedFoodIds(customFoods.map((food) => food.foodId));
      setFoodSelectionReady(true);
    }
  }, [customFoods, foodSelectionReady]);

  useEffect(() => {
    if (meals !== undefined && !mealSelectionReady) {
      setSelectedMealIds(meals.map((meal) => meal.id));
      setMealSelectionReady(true);
    }
  }, [meals, mealSelectionReady]);

  useEffect(() => {
    if (!goalsLoading && !goalSelectionReady) {
      setSelectedGoalIds(goals.map(goalRowId));
      setGoalSelectionReady(true);
    }
  }, [goals, goalsLoading, goalSelectionReady]);

  const selectedCustomFoods =
    customFoods?.filter((food) => selectedFoodIds.includes(food.foodId)) ?? [];
  const selectedMeals =
    meals?.filter((meal) => selectedMealIds.includes(meal.id)) ?? [];
  const selectedGoals = goals.filter((goal) =>
    selectedGoalIds.includes(goalRowId(goal))
  );

  const prepareSelected = async () => {
    const foodUnits = await queryClient.fetchQuery(buildFoodUnitsQuery());
    const unitsById = new Map(
      foodUnits.map((unit) => [unit.id, unit] as const)
    );

    return prepareMigrationBackup({
      customFoods: selectedCustomFoods,
      meals: selectedMeals,
      goals: selectedGoals,
      unitsById,
      getFoodDetails: (foodId) =>
        queryClient.fetchQuery({
          ...buildGetFoodQuery(foodId),
          retry: false,
        }),
    });
  };

  const backupSelected = withErrorToaster(async () => {
    const prepared = await prepareSelected();
    const parts: Array<string> = [];

    if (prepared.customFoods.length > 0) {
      await saveCustomFoods(prepared.customFoods);
      parts.push(
        prepared.customFoods.length === 1
          ? "1 custom food"
          : `${prepared.customFoods.length} custom foods`
      );
    }

    if (prepared.meals.length > 0) {
      await saveMeals(prepared.meals);
      parts.push(
        prepared.meals.length === 1
          ? "1 meal"
          : `${prepared.meals.length} meals`
      );
    }

    if (prepared.goals.length > 0) {
      await saveGoals(prepared.goals);
      parts.push(
        prepared.goals.length === 1
          ? "1 goal"
          : `${prepared.goals.length} goals`
      );
    }

    if (parts.length === 0) {
      return;
    }

    showSuccessToast(`Saved ${parts.join(" and ")}`);
  }, "Error saving backup");

  const downloadSelectedJson = withErrorToaster(async () => {
    const jsonString = stringifyMigrationBackup(
      buildMigrationBackupDocument(await prepareSelected())
    );
    const jsonBytes = new TextEncoder().encode(jsonString);
    const blob = new File([jsonBytes], MIGRATION_JSON_FILENAME, {
      type: "application/json; charset=utf-8",
    });

    const downloadLink = document.createElement("a");
    downloadLink.className = "hidden";
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = MIGRATION_JSON_FILENAME;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    showSuccessToast("Downloaded JSON file");
  }, "Error saving JSON file");

  const actionsDisabled =
    customFoodsLoading ||
    mealsLoading ||
    goalsLoading ||
    (selectedCustomFoods.length === 0 &&
      selectedMeals.length === 0 &&
      selectedGoals.length === 0);

  return (
    <div className="my-4">
      <Paper className="p-4 mb-4">
        <Typography variant="h4" className="mb-4">
          Fitbit to Google Health migration
        </Typography>
        <Typography variant="body1" component="p" className="space-y-4">
          <p>
          Google Health does not support meals or custom foods created on this
          website the same way Fitbit does. Back up a local copy of meals,
          custom foods, and goals so you can keep using them here (on this
          website) after you migrate. Backed-up data will only be available on
          this website, not in the Google Health app.
          </p>
          <p>You can also download a copy in .json format for your own records.</p>
        </Typography>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outlined"
            disabled={actionsDisabled}
            onClick={downloadSelectedJson}
          >
            Save JSON file
          </Button>
          <Button
            variant="contained"
            disabled={actionsDisabled}
            onClick={backupSelected}
          >
            Backup selected data
          </Button>
        </div>
      </Paper>

      <BackupSection title="Custom foods">
        <DataGrid<Food>
          className="w-full"
          autoHeight
          checkboxSelection
          loading={customFoodsLoading}
          rows={customFoods}
          columns={customFoodColumns}
          getRowId={(food) => food.foodId}
          rowSelectionModel={selectedFoodIds}
          onRowSelectionModelChange={(ids: GridRowSelectionModel) => {
            setSelectedFoodIds(ids as Array<number>);
          }}
        />
      </BackupSection>

      <BackupSection title="Meals">
        <DataGrid<Meal>
          className="w-full"
          autoHeight
          checkboxSelection
          loading={mealsLoading}
          rows={meals}
          columns={mealColumns}
          getRowId={(meal) => meal.id}
          rowSelectionModel={selectedMealIds}
          onRowSelectionModelChange={(ids: GridRowSelectionModel) => {
            setSelectedMealIds(ids as Array<string>);
          }}
        />
      </BackupSection>

      <BackupSection title="Goals">
        <DataGrid<MigrationGoal>
          className="w-full"
          autoHeight
          checkboxSelection
          loading={goalsLoading}
          rows={goals}
          columns={goalColumns}
          getRowId={goalRowId}
          rowSelectionModel={selectedGoalIds}
          onRowSelectionModelChange={(ids: GridRowSelectionModel) => {
            setSelectedGoalIds(ids as Array<string>);
          }}
        />
      </BackupSection>
    </div>
  );
}
