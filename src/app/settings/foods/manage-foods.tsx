"use client";

import { Button, Paper, Typography } from "@mui/material";
import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { toast } from "mui-sonner";

import { buildFavoriteFoodsQuery, Food } from "@/api/nutrition";
import SearchFoods from "@/components/nutrition/food/food-search";
import {
  buildAddFavoriteFoodsMutation,
  buildDeleteFavoritesFoodMutation,
} from "@/api/nutrition/foods";

const favoriteFoodsColumns: Array<GridColDef> = [
  { field: "name", headerName: "Food", width: 400 },
  { field: "brand", headerName: "Brand" },
];

function ManageFavoriteFoods() {
  const [selectedRows, setSelectedRows] = useState<Array<number>>([]);
  const queryClient = useQueryClient();

  const { data: favoriteFoods } = useQuery(buildFavoriteFoodsQuery());

  const { mutateAsync: addFavoriteFoods } = useMutation(
    buildAddFavoriteFoodsMutation(queryClient)
  );

  const { mutateAsync: deleteFavoriteFoods } = useMutation(
    buildDeleteFavoritesFoodMutation(queryClient)
  );

  const addFavoriteFood = useCallback(
    (food: Food) => {
      addFavoriteFoods([food.foodId]).then(() => {
        toast.success("Added food to favorites list");
      });
    },
    [addFavoriteFoods]
  );

  const deleteFavorites = useCallback(() => {
    deleteFavoriteFoods(selectedRows).then(() => {
      toast.success("Removed foods from favorites list");
    });
  }, [deleteFavoriteFoods, selectedRows]);

  return (
    <>
      <Typography variant="h5" className="mb-8">
        Favorite foods
      </Typography>
      <div className="my-8">
        <AddFoodPicker addFood={addFavoriteFood} />
      </div>
      <DataGrid<Food>
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={(rows) => {
          console.log(rows);
          setSelectedRows(rows as Array<number>);
        }}
        checkboxSelection
        getRowId={(food) => food.foodId}
        rows={favoriteFoods}
        columns={favoriteFoodsColumns}
      />
      <div className="flex flex-row items-center mt-8">
        <Button
          color="warning"
          disabled={selectedRows.length === 0}
          onClick={deleteFavorites}
        >
          Remove favorites
        </Button>
      </div>
    </>
  );
}

export default function ManageFoods() {
  return (
    <Paper className="p-4">
      <Typography variant="h4" className="mb-8">
        Manage foods
      </Typography>
      <ManageFavoriteFoods />
    </Paper>
  );
}

function AddFoodPicker({ addFood }: { addFood: (food: Food) => void }) {
  const [selectedFoodToAdd, setSelectedFoodToAdd] = useState<Food | null>(null);

  const addSelectedFood = useCallback(() => {
    if (selectedFoodToAdd) {
      addFood(selectedFoodToAdd);
    }
  }, [selectedFoodToAdd, addFood]);

  return (
    <div className="flex flex-row items-center gap-x-4">
      <SearchFoods
        className="flex-1"
        value={selectedFoodToAdd}
        onChange={setSelectedFoodToAdd}
      />
      <Button disabled={!selectedFoodToAdd} onClick={addSelectedFood}>
        Add favorite food
      </Button>
    </div>
  );
}
