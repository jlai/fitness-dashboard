"use client";

import { Button, Typography } from "@mui/material";
import React, { useState } from "react";
import { usePopupState } from "material-ui-popup-state/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowParams,
} from "@mui/x-data-grid";
import { Edit } from "@mui/icons-material";
import { useAtomValue, useSetAtom } from "jotai";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";

import { buildCustomFoodsQuery, Food } from "@/api/nutrition";
import { FooterActionBar, HeaderBar } from "@/components/layout/rows";
import CreateCustomFoodDialog, {
  editingCustomFoodAtom,
  NEW_CUSTOM_FOOD,
} from "@/components/nutrition/food/custom-food";
import { buildDeleteCustomFoodsMutation } from "@/api/nutrition/foods";
import NutritionPopover, {
  ShowLabelAction,
} from "@/components/nutrition/label/nutrition-popover";
import { macroGoalsAtom } from "@/storage/settings";

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
  const [selectedRows, setSelectedRows] = useState<Array<number>>([]);
  const setEditingCustomFood = useSetAtom(editingCustomFoodAtom);
  const macroGoals = useAtomValue(macroGoalsAtom);
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: customFoods } = useQuery(buildCustomFoodsQuery());
  const { mutateAsync: deleteFoodIds } = useMutation(
    buildDeleteCustomFoodsMutation(queryClient)
  );

  const popupState = usePopupState({
    popupId: "show-nutrition-facts-popup",
    variant: "popper",
  });

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
          ? [
              <ShowLabelAction popupState={popupState} key={id} food={food} />,
              <EditAction key={id} food={food} />,
            ]
          : []),
      ],
    },
  ];

  const handleDeleteClicked = () => {
    (async () => {
      await confirm({
        title: "Delete custom foods?",
      });

      await deleteFoodIds(selectedRows);
      toast.success("Deleted custom foods");
    })();
  };

  return (
    <div>
      <HeaderBar>
        <Typography variant="h5">Custom foods</Typography>
        <div className="flex-1"></div>
        <Button onClick={() => setEditingCustomFood(NEW_CUSTOM_FOOD)}>
          Create custom food
        </Button>
      </HeaderBar>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={popupState}
        offset={[0, 15]}
      />
      <CreateCustomFoodDialog />
      <DataGrid<Food>
        className="w-full"
        loading={!customFoods}
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
          onClick={handleDeleteClicked}
        >
          Delete custom foods
        </Button>
      </FooterActionBar>
    </div>
  );
}
