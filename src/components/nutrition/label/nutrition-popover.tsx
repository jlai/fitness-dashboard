import {atom, useAtomValue} from "jotai";
import {PopupState, bindPopper} from "material-ui-popup-state/hooks";
import {useQuery} from "@tanstack/react-query";
import React from "react";
import {Box, ClickAwayListener, Popper, Tooltip, Typography} from "@mui/material";
import {Placement} from "@floating-ui/utils";
import {WarningOutlined} from "@mui/icons-material";

import {buildGetFoodQuery} from "@/api/nutrition/foods";
import NutritionLabel from "@/components/nutrition/label/nutrition-label";
import {FoodLogEntry, NutritionMacroGoals} from "@/api/nutrition";
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
          <ClickAwayListener onClickAway={popupState.close}>
            <Box className="bg-slate-50 dark:bg-slate-900 p-21">
              { context.foodLog?.loggedFood.accessLevel == "PUBLIC" && (
                <Tooltip title="Public food entry: limited nutrition data">
                  <WarningOutlined className="float-right p-1" />
                </Tooltip>
              )}
              <Typography variant="subtitle1">{food.name}</Typography>
              <NutritionLabel
                width="300px"
                servingText={formatServing({
                    amount: context.foodLog?.loggedFood.amount || food.defaultServingSize,
                    unit: context.foodLog?.loggedFood.unit || food.defaultUnit
                  }
                )}
                calories={ food.calories && context.foodLog?.loggedFood.accessLevel == "PRIVATE"
                         ? food.calories : context?.foodLog?.nutritionalValues?.calories || 0 }
                totalCarbohydrate={ food.nutritionalValues?.totalCarbohydrate
                                 || context?.foodLog?.nutritionalValues?.carbs || 0 }
                caloriesFromFat={ food.nutritionalValues?.caloriesFromFat || 0 }
                saturatedFat={ food.nutritionalValues?.saturatedFat || 0 }
                dietaryFiber={ food.nutritionalValues?.dietaryFiber
                            || context?.foodLog?.nutritionalValues?.fiber || 0 }
                cholesterol={ food.nutritionalValues?.cholesterol || 0 }
                potassium={ food.nutritionalValues?.potassium || 0 }
                totalFat={ food.nutritionalValues?.totalFat
                        || context?.foodLog?.nutritionalValues?.fat || 0 }
                transFat={ food.nutritionalValues?.transFat || 0 }
                protein={ food.nutritionalValues?.protein
                       || context?.foodLog?.nutritionalValues?.protein || 0 }
                sodium={ food.nutritionalValues?.sodium
                       || context?.foodLog?.nutritionalValues?.sodium || 0 }
                sugars={ food.nutritionalValues?.sugars || 0 }
                recommendedValues={macroGoals}
                multiplier={ food.calories && context.foodLog?.loggedFood.accessLevel == "PRIVATE"
                           ? context.foodLog.loggedFood.calories / (food.calories || 1) : 1 }
                vitamins={[]}
              />
            </Box>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  )
}

export default NutritionPopover;