import dayjs, { Dayjs } from "dayjs";
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableHead,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  MoreVert,
  MoveDown as MoveIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { useEffect, useMemo } from "react";
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
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

import {
  buildDeleteFoodLogsMutation,
  buildFoodLogQuery,
} from "@/api/nutrition";
import { foodLogTotalsPositionAtom } from "@/storage/settings";
import { FormActionRow } from "@/components/forms/form-row";

import { groupByMealType } from "./summarize-day";
import { selectedFoodLogsAtom } from "./atoms";
import {
  copyDialogOpenAtom,
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
import { CopyFoodLogsDialog } from "./dialogs/copy-food-logs";

export default function FoodLog({ day }: { day: Dayjs }) {
  const menuPopupState = usePopupState({
    variant: "popover",
    popupId: "food-log-actions-menu",
  });

  const [selectedFoodLogs, setSelectedFoodLogs] = useAtom(selectedFoodLogsAtom);
  const setMoveDialogOpen = useSetAtom(moveDialogOpenAtom);
  const setCopyDialogOpen = useSetAtom(copyDialogOpenAtom);
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

  const deleteSelected = () => {
    (async () => {
      await confirm({
        title: "Deleted selected food logs?",
        confirmationText: "Delete",
      });

      const deletes = selectedFoodLogs.map((foodLog) => ({
        foodLogId: foodLog.logId,
        day: dayjs(foodLog.logDate),
      }));

      await deleteFoodLogs([...deletes]);

      toast.success("Deleted food logs");
    })();
  };

  return (
    <section aria-label="Logged foods">
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
      <FormActionRow justifyContent="start">
        <Button
          disabled={selectedFoodLogs.size === 0}
          color="warning"
          onClick={deleteSelected}
          startIcon={<DeleteIcon />}
        >
          Delete
        </Button>
        <Button
          disabled={selectedFoodLogs.size === 0}
          onClick={() => setMoveDialogOpen(true)}
          startIcon={<MoveIcon />}
        >
          Move
        </Button>
        <Button
          disabled={selectedFoodLogs.size === 0}
          onClick={() => setCopyDialogOpen(true)}
          startIcon={<CopyIcon />}
        >
          Copy
        </Button>
        <IconButton
          disabled={selectedFoodLogs.size === 0}
          {...bindTrigger(menuPopupState)}
        >
          <MoreVert />
        </IconButton>
        <Menu {...bindMenu(menuPopupState)}>
          <MenuItem
            onClick={() => {
              setCreateMealDialogOpen(true);
              menuPopupState.close();
            }}
          >
            Create meal
          </MenuItem>
        </Menu>
      </FormActionRow>
      <MoveFoodLogsDialog />
      <CreateMealFromFoodLogsDialog />
      <CopyFoodLogsDialog />
      <div className="sm:mb-8"></div>
    </section>
  );
}
