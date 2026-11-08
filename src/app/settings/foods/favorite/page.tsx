"use client";

import { Alert, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataGrid, GridColDef, GridRowParams } from "@mui/x-data-grid";
import { usePopupState } from "material-ui-popup-state/hooks";
import { useAtomValue, useSetAtom } from "jotai";

import { buildFavoriteFoodsQuery, FavoriteFood, Food } from "@/api/nutrition";
import SearchFoods from "@/components/nutrition/food/food-search";
import { FooterActionBar } from "@/components/layout/rows";
import { FormRow } from "@/components/forms/form-row";
import NutritionPopover, {
  ShowLabelAction,
} from "@/components/nutrition/label/nutrition-popover";
import { macroGoalsAtom } from "@/storage/settings";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { settingsStorageEpochAtom } from "@/storage/settings-storage";
import { withErrorToaster } from "@/components/toast";

export default function ManageFavoriteFoods() {
  const [selectedRows, setSelectedRows] = useState<Array<string>>([]);
  const macroGoals = useAtomValue(macroGoalsAtom);
  const { clientOnlyFavoriteFoods } = useAtomValue(clientOnlyFavoriteFoodsAtom);
  const { clientOnlyFoods } = useAtomValue(clientOnlyFoodsAtom);
  const storageEpoch = useAtomValue(settingsStorageEpochAtom);
  const setFavoriteFoods = useSetAtom(clientOnlyFavoriteFoodsAtom);
  const {
    data: favoriteFoods,
    isPending,
    isError,
  } = useQuery(
    buildFavoriteFoodsQuery(
      clientOnlyFavoriteFoods.map(({ foodId }) => foodId),
      clientOnlyFoods,
      storageEpoch,
    ),
  );

  const popupState = usePopupState({
    popupId: "show-nutrition-facts-popup",
    variant: "popper",
  });

  const favoriteFoodsColumns: Array<GridColDef<FavoriteFood>> = [
    { field: "name", headerName: "Food", flex: 2 },
    { field: "brand", headerName: "Brand", flex: 1 },
    {
      field: "accessLevel",
      headerName: "Type",
      valueGetter: (_value, food) =>
        food.unavailable
          ? "Unavailable"
          : food.accessLevel === "PRIVATE"
            ? "Custom"
            : "Public",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: ({ id, row: food }: GridRowParams<FavoriteFood>) => [
        ...(food.accessLevel === "PRIVATE"
          ? [<ShowLabelAction popupState={popupState} key={id} food={food} />]
          : []),
      ],
    },
  ];

  const handleAddFavoriteFood = withErrorToaster(async (food: Food) => {
    await setFavoriteFoods((previous) => ({
      clientOnlyFavoriteFoods: previous.clientOnlyFavoriteFoods.some(
        (entry) => entry.foodId === food.foodId,
      )
        ? previous.clientOnlyFavoriteFoods
        : [...previous.clientOnlyFavoriteFoods, { foodId: food.foodId }],
    }));
  }, "Error adding favorite food");

  const handleDeleteFavoritesClick = withErrorToaster(async () => {
    const selected = new Set(selectedRows);
    await setFavoriteFoods((previous) => ({
      clientOnlyFavoriteFoods: previous.clientOnlyFavoriteFoods.filter(
        ({ foodId }) => !selected.has(foodId),
      ),
    }));
    setSelectedRows([]);
  }, "Error removing favorite foods");

  return (
    <>
      <Typography variant="h5" className="pt-4 m-4">
        Favorite foods
      </Typography>
      <Typography className="m-4">
        Favorite foods are only part of this dashboard and are not synced with
        the Google Health app.
      </Typography>
      <div className="m-4">
        <AddFoodPicker addFood={handleAddFavoriteFood} />
      </div>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={popupState}
        offset={[0, 15]}
      />
      {isError && (
        <Alert severity="error">
          Could not load favorite foods. Please try again later.
        </Alert>
      )}
      {favoriteFoods?.some((food) => food.unavailable) && (
        <Alert severity="warning">
          Some favorite foods could not be loaded. You can still remove them.
        </Alert>
      )}
      <DataGrid<FavoriteFood>
        className="w-full"
        loading={isPending}
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={(rows) => {
          setSelectedRows(rows as Array<string>);
        }}
        checkboxSelection
        getRowId={(food) => food.foodId}
        rows={favoriteFoods ?? []}
        columns={favoriteFoodsColumns}
      />
      <FooterActionBar>
        <Button
          color="warning"
          disabled={selectedRows.length === 0}
          onClick={handleDeleteFavoritesClick}
        >
          Remove favorites
        </Button>
      </FooterActionBar>
    </>
  );
}

function AddFoodPicker({ addFood }: { addFood: (food: Food) => void }) {
  const [selectedFoodToAdd, setSelectedFoodToAdd] = useState<Food | null>(null);

  const addSelectedFood = () => {
    if (selectedFoodToAdd) {
      addFood(selectedFoodToAdd);
    }
  };

  return (
    <FormRow>
      <SearchFoods
        className="flex-1"
        value={selectedFoodToAdd}
        onChange={setSelectedFoodToAdd}
      />
      <Button disabled={!selectedFoodToAdd} onClick={addSelectedFood}>
        Add favorite food
      </Button>
    </FormRow>
  );
}
