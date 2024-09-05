import {atom, useAtomValue} from "jotai";
import {PopupState, bindPopper} from "material-ui-popup-state/hooks";
import {useQuery} from "@tanstack/react-query";
import React from "react";
import {Box, ClickAwayListener, Paper, Popper, Tooltip, Typography} from "@mui/material";
import {Placement} from "@floating-ui/utils";
import {WarningOutlined} from "@mui/icons-material";

import {buildGetFoodQuery} from "@/api/nutrition/foods";
import NutritionLabel from "@/components/nutrition/label/nutrition-label";
import {Food, FoodLogEntry, NutritionMacroGoals, NutritionalValues} from "@/api/nutrition";
import {formatServing} from "@/utils/food-amounts";

export interface NutritionPopoverContext {
  foodLog: FoodLogEntry | null;
  foodId: number;
}

const EMPTY_CONTEXT: NutritionPopoverContext = {
  foodLog: null,
  foodId: 0,
};

export const nutritionPopoverFoodAtom = atom<NutritionPopoverContext>(EMPTY_CONTEXT);

const NutritionPopover = function ({macroGoals, popupState, placement, offset}: {
  macroGoals: NutritionMacroGoals,
  offset?: [number, number],
  popupState: PopupState,
  placement?: Placement
}) {
  const context = useAtomValue(nutritionPopoverFoodAtom);
  const {data: food} = useQuery({
    ...buildGetFoodQuery(context.foodId),
    enabled: context.foodId > 0
  });

  function getNutritionValues(food: Food, foodLog: FoodLogEntry | null): NutritionalValues {
    const foodValues: {[index: string]: number}
      = (food.nutritionalValues && (!foodLog || foodLog.loggedFood.accessLevel == "PRIVATE"))
      ? { ...food.nutritionalValues } : foodLog?.nutritionalValues ? {
        // public food data
        totalCarbohydrate: foodLog.nutritionalValues.carbs,
        dietaryFiber: foodLog.nutritionalValues.fiber,
        calories: foodLog.nutritionalValues.calories,
        protein: foodLog.nutritionalValues.protein,
        sodium: foodLog.nutritionalValues.sodium,
        totalFat: foodLog.nutritionalValues.fat,
      } : {};
    const multiplier
      = food.calories && foodLog?.loggedFood.accessLevel == "PRIVATE"
      ? foodLog.loggedFood.calories / (food.calories || 1) : 1;
    const result = Object.keys(foodValues).map((key: string) => {
      return [ key, (foodValues.hasOwnProperty(key) ? foodValues[key] : 0) * multiplier ];
    });

    return Object.fromEntries(result);
  }

  return (
    <Box>
      {(food && food.defaultUnit && food.defaultServingSize) && (
        <Popper
          {...bindPopper(popupState)}
          placement={placement || "left"}
          anchorEl={popupState.anchorEl}
          modifiers={[
            {
              name: "arrow",
              enabled: true,
              options: {
                element: popupState.anchorEl,
              },
            },
            {
              name: "offset",
              enabled: true,
              options: {
                offset: offset || [0, 0],
              },
            },
          ]}
        >
          <ClickAwayListener onClickAway={popupState.close}
                             touchEvent="onTouchStart"
                             mouseEvent="onMouseDown">
            <Paper className="bg-slate-50 dark:bg-slate-900 p-2">
              { context.foodLog?.loggedFood.accessLevel == "PUBLIC" && (
                <Tooltip title="Public food entry: limited nutrition data">
                  <WarningOutlined className="float-right p-1" />
                </Tooltip>
              )}
              <Typography variant="subtitle1" sx={{
                  margin: "0 0 0.4rem 0.25rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
                  maxWidth: context.foodLog?.loggedFood.accessLevel == "PUBLIC" ? "17rem" : "18.75rem"
              }} title={food.name}>
                {food.name}
              </Typography>
              <NutritionLabel
                width="18.75rem"
                servingText={
                  formatServing({
                    amount: context.foodLog?.loggedFood.amount || food.defaultServingSize,
                    unit: context.foodLog?.loggedFood.unit || food.defaultUnit
                  })
                }
                nutritionValues={getNutritionValues(food, context.foodLog)}
                recommendedValues={macroGoals}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  )
}

export default NutritionPopover;