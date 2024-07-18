import { Remove, Add } from "@mui/icons-material";
import { Paper, ClickAwayListener, IconButton, Button } from "@mui/material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "mui-sonner";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { FormContainer } from "react-hook-form-mui";

import { ServingSize } from "@/utils/food-amounts";
import { FoodServingSizeElement } from "@/components/nutrition/food/serving-size";
import {
  buildUpdateFoodLogsMutation,
  FoodLogEntry,
  getDefaultServingSize,
} from "@/api/nutrition";

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
  const formContext = useForm<EditServingSizeFormData>({
    defaultValues: {
      food: foodLog.loggedFood,
      servingSize: getDefaultServingSize(foodLog.loggedFood),
    },
  });

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

  const adjustQuantity = useCallback(
    (adjustment: number) => {
      const servingSize = formContext.getValues().servingSize;

      if (servingSize) {
        const newAmount = servingSize.amount + adjustment;

        if (newAmount > 0) {
          formContext.setValue(
            "servingSize",
            {
              ...servingSize,
              amount: newAmount,
            },
            { shouldValidate: true }
          );
        }
      }
    },
    [formContext]
  );

  return (
    <FormContainer<EditServingSizeFormData>
      formContext={formContext}
      onSuccess={onSubmit}
    >
      <Paper className="p-4">
        <ClickAwayListener onClickAway={closePopover}>
          <div>
            <FoodServingSizeElement name="servingSize" foodFieldName="food" />
            <div className="flex flex-row items-center justify-end mt-4">
              <IconButton
                aria-label="decrease amount"
                size="small"
                onClick={() => adjustQuantity(-1)}
              >
                <Remove />
              </IconButton>
              <IconButton
                aria-label="increase amount"
                size="small"
                onClick={() => adjustQuantity(1)}
              >
                <Add />
              </IconButton>
              <div className="flex-1"></div>
              <Button onClick={closePopover}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </div>
        </ClickAwayListener>
      </Paper>
    </FormContainer>
  );
}
