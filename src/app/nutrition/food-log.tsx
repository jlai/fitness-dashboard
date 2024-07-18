import dayjs, { Dayjs } from "dayjs";
import {
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Popper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ChangeEvent, useCallback, useEffect, useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { EditOutlined as EditIcon } from "@mui/icons-material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Immutable from "immutable";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";
import { bindPopper, usePopupState } from "material-ui-popup-state/hooks";

import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import {
  FoodLogEntry,
  buildDeleteFoodLogsMutation,
  buildFoodLogQuery,
} from "@/api/nutrition";

import { groupByMealType, MealTypeSummary } from "./summarize-day";
import { selectedFoodLogsAtom, updateSelectedFoodLogAtom } from "./atoms";
import {
  createMealDialogOpenAtom,
  CreateMealFromFoodLogsDialog,
  EditServingSize,
  moveDialogOpenAtom,
  MoveFoodLogsDialog,
} from "./dialogs";

const NUTRIENT_FORMAT = FRACTION_DIGITS_1;

function formatNutrientPropValue(
  nutritionalValues: FoodLogEntry["nutritionalValues"],
  prop: string
) {
  const value = ((nutritionalValues ?? {}) as Record<string, number>)[prop];

  if (value !== undefined) {
    return NUTRIENT_FORMAT.format(value);
  }

  return undefined;
}

function MealTypeRows({ summary }: { summary: MealTypeSummary }) {
  return (
    <>
      <TableRow className="bg-slate-50">
        <TableCell className="font-medium">{summary.name}</TableCell>
        <TableCell></TableCell>
        <TableCell>{NUTRIENT_FORMAT.format(summary.calories)}</TableCell>
        {["carbs", "fat", "fiber", "protein", "sodium"].map((prop) => (
          <TableCell key={prop}>
            {formatNutrientPropValue(summary, prop)}
          </TableCell>
        ))}
      </TableRow>
      {summary.foods.map((foodLog) => (
        <FoodRow key={foodLog.logId} foodLog={foodLog} />
      ))}
    </>
  );
}

function FoodRow({ foodLog }: { foodLog: FoodLogEntry }) {
  const {
    logId,
    loggedFood: { name, amount, unit, calories },
    nutritionalValues,
  } = foodLog;

  const selectedFoodLogs = useAtomValue(selectedFoodLogsAtom);
  const updateSelectedFoodLog = useSetAtom(updateSelectedFoodLogAtom);
  const popupState = usePopupState({
    variant: "popper",
    popupId: "edit-food-serving-popup",
  });

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSelectedFoodLog(foodLog, event.target.checked);
    },
    [foodLog, updateSelectedFoodLog]
  );

  return (
    <TableRow key={logId}>
      <TableCell>
        <div className="flex flex-row items-center">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={selectedFoodLogs.has(foodLog)}
                onChange={handleChange}
              />
            }
            label={name}
          />
        </div>
      </TableCell>
      <TableCell className="group min-w-max">
        <button
          className="flex flex-row items-center"
          onClick={popupState.open}
        >
          <Typography
            variant="body1"
            sx={{
              backgroundColor: popupState.isOpen
                ? "rgb(252, 232, 3, 0.2)"
                : undefined,
            }}
          >
            {amount} {amount === 1 ? unit?.name : unit?.plural}
          </Typography>
          <div className="ms-2 invisible group-hover:visible text-slate-500">
            <EditIcon />
          </div>
        </button>
        <Popper
          {...bindPopper(popupState)}
          disablePortal
          modifiers={[
            {
              name: "arrow",
              enabled: true,
              options: {
                element: popupState.anchorEl,
              },
            },
          ]}
        >
          <EditServingSize foodLog={foodLog} closePopover={popupState.close} />
        </Popper>
      </TableCell>
      <TableCell>{NUTRIENT_FORMAT.format(calories)}</TableCell>
      {["carbs", "fat", "fiber", "protein", "sodium"].map((prop) => (
        <TableCell key={prop}>
          {formatNutrientPropValue(nutritionalValues, prop)}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function FoodLog({ day }: { day: Dayjs }) {
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);
  const setMoveDialogOpen = useSetAtom(moveDialogOpenAtom);
  const setCreateMealDialogOpen = useSetAtom(createMealDialogOpenAtom);

  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { mutateAsync: deleteFoodLogs } = useMutation(
    buildDeleteFoodLogsMutation(queryClient)
  );

  const { data: foodLogs } = useSuspenseQuery(buildFoodLogQuery(day));
  const groupedMealTypes = useMemo(
    () => groupByMealType(foodLogs.foods),
    [foodLogs]
  );

  useEffect(() => {
    // Clear when the food log list changes
    setSelectedFoodLogs(Immutable.Set([]));
  }, [foodLogs, setSelectedFoodLogs]);

  const deleteSelected = useCallback(() => {
    (async () => {
      await confirm({ title: "Deleted selected food logs?" });

      const deletes = selectedFoodLogs.map((foodLog) => ({
        foodLogId: foodLog.logId,
        day: dayjs(foodLog.logDate),
      }));

      await deleteFoodLogs([...deletes]);

      toast.success("Deleted food logs");
    })();
  }, [selectedFoodLogs, deleteFoodLogs, confirm]);

  return (
    <>
      <Paper className="max-w-full overflow-x-auto">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Food</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Calories</TableCell>
              <TableCell>Carbs</TableCell>
              <TableCell>Fat</TableCell>
              <TableCell>Fiber</TableCell>
              <TableCell>Protein</TableCell>
              <TableCell>Sodium</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...groupedMealTypes.values()]
              .filter(
                (summary) => summary.foods.length > 0 || summary.id === -1
              )
              .map((summary) => (
                <MealTypeRows key={summary.id} summary={summary} />
              ))}
          </TableBody>
        </Table>
      </Paper>
      <div className="flex flex-row items-center gap-x-2">
        <Button
          disabled={selectedFoodLogs.size === 0}
          color="warning"
          onClick={deleteSelected}
        >
          {selectedFoodLogs.size > 0
            ? `Delete ${selectedFoodLogs.size} selected`
            : "Delete selected"}
        </Button>
        <Button
          disabled={selectedFoodLogs.size === 0}
          onClick={() => setMoveDialogOpen(true)}
        >
          {selectedFoodLogs.size > 0
            ? `Move ${selectedFoodLogs.size} selected`
            : "Move selected"}
        </Button>
        <Button
          disabled={selectedFoodLogs.size === 0}
          onClick={() => setCreateMealDialogOpen(true)}
        >
          Create meal
        </Button>
      </div>
      <MoveFoodLogsDialog />
      <CreateMealFromFoodLogsDialog />
      <div className="mb-8"></div>
    </>
  );
}
