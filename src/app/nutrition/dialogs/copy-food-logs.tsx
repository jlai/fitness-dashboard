import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import Immutable from "immutable";
import { useAtom } from "jotai";
import { toast } from "mui-sonner";
import { useCallback } from "react";
import { FormContainer } from "react-hook-form-mui";
import { DatePickerElement } from "react-hook-form-mui/date-pickers";

import { MealTypeElement } from "@/components/nutrition/food/meal-type-element";
import { MealType, buildCreateMultipleFoodLogsMutation } from "@/api/nutrition";
import { FormRows } from "@/components/forms/form-row";

import { selectedFoodLogsAtom } from "../atoms";

import { copyDialogOpenAtom } from "./atoms";

interface CopyFoodLogsFormData {
  day: Dayjs;
  mealType: MealType;
}

export function CopyFoodLogsDialog() {
  const [open, setOpen] = useAtom(copyDialogOpenAtom);
  const queryClient = useQueryClient();
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);

  const { mutateAsync: createFoodLogs } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient)
  );

  const onSubmit = useCallback(
    (values: CopyFoodLogsFormData) => {
      createFoodLogs(
        [...selectedFoodLogs.values()].map((foodLog) => ({
          foodId: foodLog.loggedFood.foodId,
          mealTypeId: values.mealType,
          unitId: foodLog.loggedFood.unit!.id,
          amount: foodLog.loggedFood.amount,
          day: values.day,
        }))
      ).then(() => {
        toast.success("Copied food logs");
        setSelectedFoodLogs(Immutable.Set());
        setOpen(false);
      });
    },
    [createFoodLogs, selectedFoodLogs, setSelectedFoodLogs, setOpen]
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <FormContainer
        onSuccess={onSubmit}
        defaultValues={{ day: dayjs(), mealType: MealType.Anytime }}
      >
        <DialogTitle>Copy selected foods</DialogTitle>
        <DialogContent>
          {selectedFoodLogs.size > 1 ? (
            <p>
              Copy the selected {selectedFoodLogs.size} foods to another day.
            </p>
          ) : (
            <p>Copy selected food to another day.</p>
          )}
          <FormRows mt={4}>
            <DatePickerElement
              name="day"
              label="To date"
              rules={{ required: true }}
            />
            <MealTypeElement name="mealType" fullWidth />
          </FormRows>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit">Copy</Button>
        </DialogActions>
      </FormContainer>
    </Dialog>
  );
}
