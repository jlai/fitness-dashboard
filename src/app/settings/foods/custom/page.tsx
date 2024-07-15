"use client";

import { Button, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowParams,
} from "@mui/x-data-grid";
import { Edit } from "@mui/icons-material";
import { useAtom, useSetAtom } from "jotai";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";

import { buildCustomFoodsQuery, Food } from "@/api/nutrition";
import { FooterActionBar, HeaderBar } from "@/components/layout/rows";
import CreateCustomFoodDialog, {
  editingCustomFoodAtom,
  NEW_CUSTOM_FOOD,
} from "@/components/nutrition/food/custom-food";
import { buildDeleteCustomFoodsMutation } from "@/api/nutrition/foods";

const customFoodsColumns: Array<GridColDef<Food>> = [
  { field: "name", headerName: "Food", flex: 2 },
  { field: "brand", headerName: "Brand", flex: 1 },
  {
    field: "accessLevel",
    headerName: "Type",
    valueFormatter: (accessLevel) =>
      accessLevel === "PRIVATE" ? "Custom" : "Public",
  },
  {
    field: "actions",
    type: "actions",
    headerName: "Actions",
    width: 100,
    getActions: ({ id, row: food }: GridRowParams<Food>) => [
      ...(food.accessLevel === "PRIVATE"
        ? [<EditAction key={id} food={food} />]
        : []),
    ],
  },
];

function EditAction({ food }: { food: Food }) {
  const setEditingCustomFood = useSetAtom(editingCustomFoodAtom);

  return (
    <GridActionsCellItem
      icon={<Edit />}
      onClick={() => setEditingCustomFood(food.foodId)}
      label="Edit"
      showInMenu={false}
    />
  );
}

export default function ManageCustomFoods() {
  const confirm = useConfirm();
  const [selectedRows, setSelectedRows] = useState<Array<number>>([]);
  const [editingCustomFood, setEditingCustomFood] = useAtom(
    editingCustomFoodAtom
  );

  const queryClient = useQueryClient();

  const { data: customFoods } = useQuery(buildCustomFoodsQuery());
  const { mutateAsync: deleteFoodIds } = useMutation(
    buildDeleteCustomFoodsMutation(queryClient)
  );

  const deleteCustomFoods = useCallback(() => {
    (async () => {
      await confirm({
        title: "Delete custom foods?",
      });

      await deleteFoodIds(selectedRows);
      toast.success("Deleted custom foods");
    })();
  }, [selectedRows, deleteFoodIds, confirm]);

  return (
    <>
      <HeaderBar>
        <Typography variant="h5">Custom foods</Typography>
        <div className="flex-1"></div>
        <Button onClick={() => setEditingCustomFood(NEW_CUSTOM_FOOD)}>
          Create custom food
        </Button>
      </HeaderBar>
      <CreateCustomFoodDialog />
      <DataGrid<Food>
        className="w-full"
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={(rows) => {
          setSelectedRows(rows as Array<number>);
        }}
        checkboxSelection
        getRowId={(food) => food.foodId}
        rows={customFoods}
        columns={customFoodsColumns}
      />
      <FooterActionBar>
        <Button
          color="warning"
          disabled={selectedRows.length === 0}
          onClick={deleteCustomFoods}
        >
          Delete custom foods
        </Button>
      </FooterActionBar>
    </>
  );
}
