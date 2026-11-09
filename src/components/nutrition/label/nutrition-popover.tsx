import { atom, useAtomValue } from "jotai";
import { PopupState, bindPopper } from "material-ui-popup-state/hooks";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  ClickAwayListener,
  Paper,
  Popper,
  Typography,
} from "@mui/material";
import { Placement } from "@floating-ui/utils";
import { ArticleOutlined } from "@mui/icons-material";
import { useSetAtom } from "jotai/index";
import { GridActionsCellItem } from "@mui/x-data-grid";

import { buildGetFoodQuery } from "@/api/nutrition/foods";
import NutritionLabel from "@/components/nutrition/label/nutrition-label";
import {
  Food,
  NutritionLog,
  NutritionMacroGoals,
  NutritionalValues,
  nutritionLogMacros,
  nutritionLogServingUnit,
} from "@/api/nutrition";
import { formatServing, ServingSize } from "@/utils/food-amounts";

export interface NutritionPopoverContext {
  nutritionLog: NutritionLog | null;
  foodId: string;
  food?: Food;
  servingSize?: ServingSize;
}

const EMPTY_CONTEXT: NutritionPopoverContext = {
  nutritionLog: null,
  foodId: "",
};

export const nutritionPopoverFoodAtom =
  atom<NutritionPopoverContext>(EMPTY_CONTEXT);

export function ShowLabelAction({
  food,
  popupState,
  useProvidedFood = false,
}: {
  food: Food;
  popupState: PopupState;
  useProvidedFood?: boolean;
}) {
  const setFood = useSetAtom(nutritionPopoverFoodAtom);

  return (
    <GridActionsCellItem
      onClick={(event) => {
        if (!popupState.isOpen) {
          setFood({
            foodId: food.foodId,
            nutritionLog: null,
            ...(useProvidedFood ? { food } : {}),
          });
          popupState.open(event);
        }
      }}
      icon={<ArticleOutlined />}
      label="Nutrition facts"
      title="Nutrition facts"
      showInMenu={false}
    />
  );
}

const NutritionPopover = function ({
  macroGoals,
  popupState,
  placement,
  offset,
}: {
  macroGoals: NutritionMacroGoals;
  offset?: [number, number];
  popupState: PopupState;
  placement?: Placement;
}) {
  const context = useAtomValue(nutritionPopoverFoodAtom);
  const { data: fetchedFood } = useQuery({
    ...buildGetFoodQuery(context.foodId),
    enabled: Boolean(context.foodId) && !context.food,
  });
  const food = context.food ?? fetchedFood;

  function getNutritionValues(
    food: Food,
    nutritionLog: NutritionLog | null,
    servingSize?: ServingSize,
  ): NutritionalValues {
    const logMacros = nutritionLog
      ? nutritionLogMacros(nutritionLog)
      : undefined;
    const foodValues: NutritionalValues =
      food.nutritionalValues && (!nutritionLog || food.accessLevel == "PRIVATE")
        ? {
            ...food.nutritionalValues,
            calories: food.nutritionalValues.calories ?? food.calories,
          }
        : logMacros
          ? {
              ...logMacros,
              totalCarbohydrate: logMacros.carbs,
              dietaryFiber: logMacros.fiber,
              totalFat: logMacros.fat,
            }
          : {};
    const multiplier = servingSize
      ? servingSize.servingAmount !== undefined
        ? (servingSize.amount / servingSize.servingAmount) *
          (servingSize.multiplier ?? 1)
        : servingSize.amount / (food.defaultServingSize || 1)
      : food.calories && food.accessLevel == "PRIVATE" && nutritionLog
        ? (nutritionLog.energy?.kcal ?? 0) / (food.calories || 1)
        : 1;
    return Object.fromEntries(
      Object.entries(foodValues).flatMap(([key, value]) =>
        typeof value === "number" ? [[key, value * multiplier]] : [],
      ),
    );
  }

  return (
    <Box>
      {food && (
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
          <ClickAwayListener
            onClickAway={() => popupState.close()}
            touchEvent="onTouchStart"
            mouseEvent="onMouseDown"
          >
            <Paper className="p-2" sx={{ backgroundColor: "#fff" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  margin: "0 0 0.4rem 0.25rem",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: "18.75rem",
                }}
                title={food.name}
              >
                {food.name}
              </Typography>
              <NutritionLabel
                width="18.75rem"
                servingText={formatServing({
                  amount:
                    context.servingSize?.amount ||
                    context.nutritionLog?.serving?.amount ||
                    food.defaultServingSize ||
                    1,
                  unit: context.servingSize?.unit ||
                    (context.nutritionLog &&
                      nutritionLogServingUnit(context.nutritionLog)) ||
                    food.defaultUnit || {
                      id: "",
                      name: "serving",
                      plural: "servings",
                    },
                })}
                nutritionValues={getNutritionValues(
                  food,
                  context.nutritionLog,
                  context.servingSize,
                )}
                recommendedValues={macroGoals}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
      )}
    </Box>
  );
};

export default NutritionPopover;
