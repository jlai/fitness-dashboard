import {atom, useAtomValue} from "jotai";
import {PopupState, bindPopper} from "material-ui-popup-state/hooks";
import {useQuery} from "@tanstack/react-query";
import React from "react";
import {Box, ClickAwayListener, Popper} from "@mui/material";

import {buildGetFoodQuery} from "@/api/nutrition/foods";
import {formatServing} from "@/utils/food-amounts";
import NutritionLabel from "@/components/nutrition/label/nutrition-label";
import {Food, NutritionMacroGoals} from "@/api/nutrition";


export const nutritionPopoverFoodAtom = atom<Food | number>(0);

const NutritionPopover = function ({macroGoals, popupState}: {
  macroGoals: NutritionMacroGoals,
  popupState: PopupState
}) {
  const foodOrId = useAtomValue(nutritionPopoverFoodAtom);
  const isFoodType = typeof foodOrId == "object";
  const foodId = isFoodType ? foodOrId.foodId : foodOrId;
  const {data: food} = useQuery({
    ...buildGetFoodQuery(foodId),
    enabled: (!isFoodType && foodId > 0) || (isFoodType && !foodOrId.nutritionalValues),
  });

  return (
    <Box>
      {food && (
        <Popper
          {...bindPopper(popupState)}
          placement="left-end"
          anchorEl={popupState.anchorEl}
          modifiers={[
            {
              name: "offset",
              enabled: true,
              options: {
                offset: [-(popupState.anchorEl?.clientHeight || 16) / 2, 0],
              },
            },
          ]}
        >
          <ClickAwayListener onClickAway={popupState.close}>
            <Box className="bg-slate-50 dark:bg-slate-900 p-21">
              <h1>{food.name}</h1>
              <NutritionLabel
                width="300px"
                servingText={(food && food.defaultServingSize && food.defaultUnit) ?
                  formatServing({
                    amount: food.defaultServingSize,
                    unit: food.defaultUnit,
                  }) : "1 serving"
                }
                calories={ food.nutritionalValues?.calories || food.nutritionalValues?.calories || 0 }
                totalCarbohydrate={ food.nutritionalValues?.totalCarbohydrate || 0 }
                caloriesFromFat={ food.nutritionalValues?.caloriesFromFat || 0 }
                saturatedFat={ food.nutritionalValues?.saturatedFat || 0 }
                dietaryFiber={ food.nutritionalValues?.dietaryFiber || 0 }
                cholesterol={ food.nutritionalValues?.cholesterol || 0 }
                potassium={ food.nutritionalValues?.potassium || 0 }
                totalFat={ food.nutritionalValues?.totalFat || 0 }
                transFat={ food.nutritionalValues?.transFat || 0 }
                protein={ food.nutritionalValues?.protein || 0 }
                sodium={ food.nutritionalValues?.sodium || 0 }
                sugars={ food.nutritionalValues?.sugars || 0 }
                recommendedValues={macroGoals}
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