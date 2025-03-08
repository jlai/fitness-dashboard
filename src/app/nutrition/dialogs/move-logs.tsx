import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import Immutable from "immutable";
import { useAtom } from "jotai";
import { FormContainer } from "react-hook-form-mui";

import { MealTypeElement } from "@/components/nutrition/food/meal-type-element";
import { MealType, buildUpdateFoodLogsMutation } from "@/api/nutrition";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { selectedFoodLogsAtom } from "../atoms";

import { moveDialogOpenAtom } from "./atoms";

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

  const onSubmit = withErrorToaster(async (values: MoveFoodLogsFormData) => {
    await updateFoodLogs(
      [...selectedFoodLogs.values()].map((foodLog) => ({
        foodLogId: foodLog.logId,
        mealTypeId: values.mealType,
        unitId: foodLog.loggedFood.unit!.id,
        amount: foodLog.loggedFood.amount,
        day: dayjs(foodLog.logDate),
      }))
    );
    showSuccessToast("Moved food logs");
    setSelectedFoodLogs(Immutable.Set());
    setOpen(false);
  }, "Error moving food logs");

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
