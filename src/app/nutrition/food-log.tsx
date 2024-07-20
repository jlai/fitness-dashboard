import dayjs, { Dayjs } from "dayjs";
import { Button, Paper, Table, TableBody, TableHead } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Immutable from "immutable";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";

import {
  buildDeleteFoodLogsMutation,
  buildFoodLogQuery,
} from "@/api/nutrition";
import { foodLogTotalsPositionAtom } from "@/storage/settings";

import { groupByMealType } from "./summarize-day";
import { selectedFoodLogsAtom } from "./atoms";
import {
  createMealDialogOpenAtom,
  CreateMealFromFoodLogsDialog,
  moveDialogOpenAtom,
  MoveFoodLogsDialog,
} from "./dialogs";
import {
  FoodLogTableHeaderRows,
  MealTypeRows,
  TotalsRow,
} from "./dialogs/food-log-rows";

export default function FoodLog({ day }: { day: Dayjs }) {
  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);
  const setMoveDialogOpen = useSetAtom(moveDialogOpenAtom);
  const setCreateMealDialogOpen = useSetAtom(createMealDialogOpenAtom);
  const foodLogTotalsPosition = useAtomValue(foodLogTotalsPositionAtom);

  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { mutateAsync: deleteFoodLogs } = useMutation(
    buildDeleteFoodLogsMutation(queryClient)
  );

  const { data: foodLogsResponse } = useSuspenseQuery(buildFoodLogQuery(day));
  const groupedMealTypes = useMemo(
    () => groupByMealType(foodLogsResponse.foods),
    [foodLogsResponse]
  );

  useEffect(() => {
    // Clear when the food log list changes
    setSelectedFoodLogs(Immutable.Set([]));
  }, [foodLogsResponse.foods, setSelectedFoodLogs]);

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
            <FoodLogTableHeaderRows />
          </TableHead>
          <TableBody>
            {foodLogTotalsPosition !== "bottom" && (
              <TotalsRow foodLogsResponse={foodLogsResponse} />
            )}
            {[...groupedMealTypes.values()]
              .filter(
                (summary) => summary.foods.length > 0 || summary.id === -1
              )
              .map((summary) => (
                <MealTypeRows key={summary.id} summary={summary} />
              ))}
            {foodLogTotalsPosition !== "top" && (
              <TotalsRow foodLogsResponse={foodLogsResponse} />
            )}
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
