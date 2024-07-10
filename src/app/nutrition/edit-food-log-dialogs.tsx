import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  ClickAwayListener,
} from "@mui/material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import Immutable from "immutable";
import { useAtom } from "jotai";
import { toast } from "mui-sonner";
import { useCallback } from "react";
import { FormContainer } from "react-hook-form-mui";

import {
  ServingSize,
  FoodServingSizeElement,
} from "@/components/nutrition/food/serving-size";
import { MealTypeElement } from "@/components/nutrition/food/meal-type-element";
import {
  MealType,
  buildUpdateFoodLogsMutation,
  FoodLogEntry,
  getDefaultServingSize,
} from "@/api/nutrition";

import { moveDialogOpenAtom, selectedFoodLogsAtom } from "./atoms";

interface MoveFoodLogsFormData {
  mealType: MealType;
}

export function MoveFoodLogsDialog() {
  const [open, setOpen] = useAtom(moveDialogOpenAtom);
  const queryClient = useQueryClient();
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);

  const { mutateAsync: updateFoodLogs } = useMutation(
    buildUpdateFoodLogsMutation(queryClient)
  );

  const onSubmit = useCallback(
    (values: MoveFoodLogsFormData) => {
      updateFoodLogs(
        [...selectedFoodLogs.values()].map((foodLog) => ({
          foodLogId: foodLog.logId,
          mealTypeId: values.mealType,
          unitId: foodLog.loggedFood.unit!.id,
          amount: foodLog.loggedFood.amount,
          day: dayjs(foodLog.logDate),
        }))
      ).then(() => {
        toast.success("Moved food logs");
        setSelectedFoodLogs(Immutable.Set());
        setOpen(false);
      });
    },
    [updateFoodLogs, selectedFoodLogs, setSelectedFoodLogs, setOpen]
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <FormContainer
        onSuccess={onSubmit}
        defaultValues={{ mealType: MealType.Anytime }}
      >
        <DialogTitle>Move to a different time?</DialogTitle>
        <DialogContent>
          <div className="py-4 w-full">
            <MealTypeElement name="mealType" fullWidth />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit">Move</Button>
        </DialogActions>
      </FormContainer>
    </Dialog>
  );
}

interface EditServingSizeFormData {
  food: FoodLogEntry;
  servingSize: ServingSize | null;
}

export function EditServingSize({
  foodLog,
  closePopover,
}: {
  foodLog: FoodLogEntry;
  closePopover: () => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateFoodLogs } = useMutation(
    buildUpdateFoodLogsMutation(queryClient)
  );

  const onSubmit = useCallback(
    (values: EditServingSizeFormData) => {
      const { servingSize } = values;

      if (!servingSize) {
        return;
      }

      updateFoodLogs([
        {
          foodLogId: foodLog.logId,
          mealTypeId: foodLog.loggedFood.mealTypeId,
          amount: servingSize.amount,
          unitId: servingSize.unit.id,
          day: dayjs(foodLog.logDate),
        },
      ]).then(() => {
        toast.success("Updated amount");
      });

      closePopover();
    },
    [closePopover, foodLog, updateFoodLogs]
  );

  return (
    <FormContainer<EditServingSizeFormData>
      onSuccess={onSubmit}
      defaultValues={{
        food: foodLog.loggedFood,
        servingSize: getDefaultServingSize(foodLog.loggedFood),
      }}
    >
      <Paper className="p-4">
        <ClickAwayListener onClickAway={closePopover}>
          <div>
            <FoodServingSizeElement name="servingSize" foodFieldName="food" />
            <div className="flex flex-row items-center justify-end mt-4">
              <Button onClick={closePopover}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </div>
        </ClickAwayListener>
      </Paper>
    </FormContainer>
  );
}
