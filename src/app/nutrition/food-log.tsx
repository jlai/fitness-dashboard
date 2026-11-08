import { Dayjs } from "dayjs";
import {
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
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
  Star,
  StarBorder,
  MenuBook,
} from "@mui/icons-material";
import { useEffect, useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Immutable from "immutable";
import { useConfirm } from "material-ui-confirm";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { toast } from "mui-sonner";

import {
  buildDeleteFoodLogsMutation,
  buildFoodLogQuery,
  getDataPointIdFromName,
} from "@/api/nutrition";
import {
  foodLogTotalsPositionAtom,
  foodLogGoalsPositionAtom,
} from "@/storage/settings";
import { FormActionRow } from "@/components/forms/form-row";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { isDataPointFromThisApp, isValidDataPointId } from "@/api/datapoints";

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
  NutritionGoalsSummary,
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
  const foodLogGoalsPosition = useAtomValue(foodLogGoalsPositionAtom);
  const { clientOnlyFavoriteFoods } = useAtomValue(clientOnlyFavoriteFoodsAtom);
  const setFavoriteFoods = useSetAtom(clientOnlyFavoriteFoodsAtom);

  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { mutateAsync: deleteFoodLogs } = useMutation(
    buildDeleteFoodLogsMutation(queryClient),
  );

  const [{ data: foodLogsResponse }] = useSuspenseQueries({
    queries: [buildFoodLogQuery(day)],
  });
  const groupedMealTypes = useMemo(
    () => groupByMealType(foodLogsResponse.dataPoints),
    [foodLogsResponse],
  );

  useEffect(() => {
    // Clear when the food log list changes
    setSelectedFoodLogs(Immutable.Set([]));
  }, [foodLogsResponse.dataPoints, setSelectedFoodLogs]);

  const deleteSelected = withErrorToaster(async () => {
    const { confirmed } = await confirm({
      title: "Deleted selected food logs?",
      confirmationText: "Delete",
    });

    if (confirmed) {
      const deletes = selectedFoodLogs.map((foodLog) => ({
        name: foodLog.name!,
        day,
      }));

      await deleteFoodLogs([...deletes]);
      showSuccessToast("Deleted food logs");
    }
  }, "Error deleting food logs");

  const handleAddToFavoritesClick = withErrorToaster(async () => {
    menuPopupState.close();
    const ids = [...selectedFoodLogs].map((foodLog) =>
      getDataPointIdFromName(foodLog.nutritionLog.food),
    );
    if (ids.some((id) => !isValidDataPointId(id))) {
      toast.error(
        "Only logged foods with a food ID can be added to favorites.",
      );
      return;
    }
    await setFavoriteFoods((previous) => {
      const existing = new Set(
        previous.clientOnlyFavoriteFoods.map(({ foodId }) => foodId),
      );
      const additions = [...new Set(ids)]
        .filter((id) => !existing.has(id))
        .map((foodId) => ({ foodId }));
      return {
        clientOnlyFavoriteFoods: [
          ...previous.clientOnlyFavoriteFoods,
          ...additions,
        ],
      };
    });
  }, "Error adding favorite foods");

  const handleRemoveFromFavoritesClick = withErrorToaster(async () => {
    menuPopupState.close();
    const ids = new Set(
      [...selectedFoodLogs].map((foodLog) =>
        getDataPointIdFromName(foodLog.nutritionLog.food),
      ),
    );
    await setFavoriteFoods((previous) => ({
      clientOnlyFavoriteFoods: previous.clientOnlyFavoriteFoods.filter(
        ({ foodId }) => !ids.has(foodId),
      ),
    }));
  }, "Error removing favorite foods");

  const favoriteFoodIds = new Set(
    clientOnlyFavoriteFoods.map(({ foodId }) => foodId),
  );
  const hasNonOwnedSelected = selectedFoodLogs.some(
    (foodLog) => !isDataPointFromThisApp(foodLog),
  );
  const areSelectedAllFavorites = selectedFoodLogs.every((foodLog) =>
    favoriteFoodIds.has(getDataPointIdFromName(foodLog.nutritionLog.food)),
  );

  return (
    <section aria-label="Logged foods">
      <Paper className="max-w-full overflow-x-auto">
        <Table size="small">
          <TableHead>
            <FoodLogTableHeaderRows />
          </TableHead>
          <TableBody>
            {(foodLogGoalsPosition === "top" ||
              foodLogGoalsPosition === "both") && (
              <NutritionGoalsSummary totals={foodLogsResponse.summary} />
            )}
            {foodLogTotalsPosition !== "bottom" && (
              <TotalsRow foodLogsResponse={foodLogsResponse} />
            )}
            {[...groupedMealTypes.values()]
              .filter(
                (summary) => summary.foods.length > 0 || summary.id === -1,
              )
              .map((summary) => (
                <MealTypeRows key={summary.id} summary={summary} />
              ))}
            {foodLogTotalsPosition !== "top" && (
              <TotalsRow foodLogsResponse={foodLogsResponse} />
            )}
            {(foodLogGoalsPosition === "bottom" ||
              foodLogGoalsPosition === "both") && (
              <NutritionGoalsSummary totals={foodLogsResponse.summary} />
            )}
          </TableBody>
        </Table>
      </Paper>
      <FormActionRow justifyContent="start">
        <span
          title={
            hasNonOwnedSelected
              ? "Only foods logged by this app can be deleted."
              : undefined
          }
        >
          <Button
            disabled={selectedFoodLogs.size === 0 || hasNonOwnedSelected}
            color="warning"
            onClick={deleteSelected}
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </span>
        <span
          title={
            hasNonOwnedSelected
              ? "Only foods logged by this app can be moved."
              : undefined
          }
        >
          <Button
            disabled={selectedFoodLogs.size === 0 || hasNonOwnedSelected}
            onClick={() => setMoveDialogOpen(true)}
            startIcon={<MoveIcon />}
          >
            Move
          </Button>
        </span>
        <Button
          disabled={selectedFoodLogs.size === 0}
          onClick={() => setCopyDialogOpen(true)}
          startIcon={<CopyIcon />}
        >
          Copy
        </Button>
        <IconButton
          aria-label="more actions"
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
            <ListItemIcon>
              <MenuBook />
            </ListItemIcon>
            <ListItemText>Create meal</ListItemText>
          </MenuItem>
          {areSelectedAllFavorites ? (
            <MenuItem onClick={handleRemoveFromFavoritesClick}>
              <ListItemIcon>
                <StarBorder />
              </ListItemIcon>
              <ListItemText>Remove from favorites</ListItemText>{" "}
            </MenuItem>
          ) : (
            <MenuItem onClick={handleAddToFavoritesClick}>
              <ListItemIcon>
                <Star />
              </ListItemIcon>
              <ListItemText>Add to favorites</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </FormActionRow>
      <MoveFoodLogsDialog />
      <CreateMealFromFoodLogsDialog />
      <CopyFoodLogsDialog />
      <div className="sm:mb-8"></div>
    </section>
  );
}
