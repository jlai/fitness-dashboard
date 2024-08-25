import dayjs, { Dayjs } from "dayjs";
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
import { toast } from "mui-sonner";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

import {
  buildDeleteFoodLogsMutation,
  buildFavoriteFoodsQuery,
  buildFoodLogQuery,
} from "@/api/nutrition";
import { foodLogTotalsPositionAtom, foodLogGoalsPositionAtom } from "@/storage/settings";
import { FormActionRow } from "@/components/forms/form-row";
import {
  buildAddFavoriteFoodsMutation,
  buildDeleteFavoritesFoodMutation,
} from "@/api/nutrition/foods";

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
  NutritionGoalsRow,
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

  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { mutateAsync: deleteFoodLogs } = useMutation(
    buildDeleteFoodLogsMutation(queryClient)
  );
  const { mutateAsync: addFavoriteFoods } = useMutation(
    buildAddFavoriteFoodsMutation(queryClient)
  );
  const { mutateAsync: removeFavoriteFoods } = useMutation(
    buildDeleteFavoritesFoodMutation(queryClient)
  );

  const [{ data: foodLogsResponse }, { data: favoriteFoods }] =
    useSuspenseQueries({
      queries: [buildFoodLogQuery(day), buildFavoriteFoodsQuery()],
    });
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

  const handleAddToFavoritesClick = () => {
    menuPopupState.close();

    const foodIds = selectedFoodLogs.map(
      (foodLog) => foodLog.loggedFood.foodId
    );
    addFavoriteFoods([...foodIds]).then(() => {
      toast.success(`Added to favorites`);
    });
  };

  const handleRemoveFromFavoritesClick = () => {
    menuPopupState.close();

    const foodIds = selectedFoodLogs.map(
      (foodLog) => foodLog.loggedFood.foodId
    );
    removeFavoriteFoods([...foodIds]).then(() => {
      toast.success(`Removed from favorites`);
    });
  };

  const favoriteFoodIds = new Set(favoriteFoods.map(({ foodId }) => foodId));
  const areSelectedAllFavorites = selectedFoodLogs.every((foodLog) =>
    favoriteFoodIds.has(foodLog.loggedFood.foodId)
  );

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
            {(foodLogGoalsPosition === "top" || foodLogGoalsPosition === "both") && (
                <NutritionGoalsRow totals={foodLogsResponse.summary} />
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
            {(foodLogGoalsPosition === "bottom" || foodLogGoalsPosition === "both") && (
                <NutritionGoalsRow totals={foodLogsResponse.summary} />
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
