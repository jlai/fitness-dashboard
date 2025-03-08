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
import { FormContainer } from "react-hook-form-mui";
import { DatePickerElement } from "react-hook-form-mui/date-pickers";

import { MealTypeElement } from "@/components/nutrition/food/meal-type-element";
import { MealType, buildCreateMultipleFoodLogsMutation } from "@/api/nutrition";
import { FormRows } from "@/components/forms/form-row";
import { getLabel } from "@/components/day-navigator";
import { selectedDayForPageAtom } from "@/state";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { selectedFoodLogsAtom } from "../atoms";

import { copyDialogOpenAtom } from "./atoms";

interface CopyFoodLogsFormData {
  day: Dayjs;
  mealType: MealType;
}

export function CopyFoodLogsDialog() {
  const [open, setOpen] = useAtom(copyDialogOpenAtom);
  const [selectedDay, setSelectedDay] = useAtom(selectedDayForPageAtom);
  const queryClient = useQueryClient();
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);

  const { mutateAsync: createFoodLogs, isPending: isSubmitting } = useMutation(
    buildCreateMultipleFoodLogsMutation(queryClient)
  );

  const onSubmit = withErrorToaster(async (values: CopyFoodLogsFormData) => {
    if (isSubmitting) {
      return;
    }

    await createFoodLogs(
      [...selectedFoodLogs.values()].map((foodLog) => ({
        foodId: foodLog.loggedFood.foodId,
        mealTypeId: values.mealType,
        unitId: foodLog.loggedFood.unit!.id,
        amount: foodLog.loggedFood.amount,
        day: values.day,
      }))
    );

    showSuccessToast("Copied food logs", {
      action: !values.day.isSame(selectedDay, "day")
        ? {
            label: <>Go to {getLabel(values.day)}</>,
            onClick: () => setSelectedDay(values.day),
          }
        : undefined,
    });

    setSelectedFoodLogs(Immutable.Set());
    setOpen(false);
  }, "Error copying food logs");

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <FormContainer
        onSuccess={onSubmit}
        defaultValues={{
          day: dayjs().startOf("day"),
          mealType: MealType.Anytime,
        }}
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
