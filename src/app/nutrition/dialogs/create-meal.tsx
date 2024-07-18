import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useAtom, useAtomValue } from "jotai";

import { CreateOrEditMeal } from "@/components/nutrition/meal/edit-meal";

import { selectedFoodLogsAtom } from "../atoms";

import { createMealDialogOpenAtom } from "./atoms";

export function CreateMealFromFoodLogsDialog() {
  const [isOpen, setOpen] = useAtom(createMealDialogOpenAtom);
  const selectedFoodLogs = useAtomValue(selectedFoodLogsAtom);

  const initialMeal = {
    id: "",
    name: "",
    description: "",
    mealFoods: [...selectedFoodLogs].map((foodLog) => ({
      ...foodLog.loggedFood,
    })),
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Create meal</DialogTitle>
      <DialogContent>
        <DialogContentText className="mb-4">
          Save as a new meal that can be used later to log a group of foods
          together.
        </DialogContentText>
        {initialMeal && (
          <CreateOrEditMeal
            showDelete={false}
            initialMeal={initialMeal}
            onUpdateMeal={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
