import {
  TableRow,
  TableCell,
  FormControlLabel,
  Checkbox,
  Typography,
  Popper,
  Chip,
  styled,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAtomValue, useSetAtom } from "jotai";
import { usePopupState, bindPopper } from "material-ui-popup-state/hooks";
import { useCallback, ChangeEvent, MouseEvent } from "react";
import { EditOutlined as EditIcon } from "@mui/icons-material";

import { formatFoodName } from "@/utils/other-formats";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import {
  FoodLogEntry,
  FoodLogSummary,
  GetFoodLogResponse,
  NutritionMacroGoals,
} from "@/api/nutrition";
import {
  foodLogShowCopyIndividualButtonAtom,
  foodLogTotalsPositionAtom,
  foodLogGoalsPositionAtom,
  macroGoalsAtom,
} from "@/storage/settings";

import { selectedFoodLogsAtom, updateSelectedFoodLogAtom } from "../atoms";
import { MealTypeSummary } from "../summarize-day";

import { EditServingSize } from "./edit-serving-size";

const NUTRIENT_FORMAT = FRACTION_DIGITS_1;
const NUTRIENT_PROPS = ["carbs", "fat", "fiber", "protein", "sodium"];

const FlatChip = styled(Chip)(() => ({
  borderRadius: 0,
  fontWeight: 400,
  fontSize: "1rem",
  lineHeight: 1.5,
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: "transparent",
    paddingLeft: 0,
    "& .MuiChip-icon": {
      display: "block",
    },
    "& .MuiChip-label": {
      paddingLeft: "6px",
    },
  },
  "& .MuiChip-label": {
    paddingLeft: "24px",
    paddingRight: 0,
  },
  "& .MuiChip-icon": { display: "none" },
}));

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

async function copyTextToClipboard(e: MouseEvent) {
  if ("clipboard" in navigator) {
    const element = e.target as Element;

    if (element && element.textContent) {
      return await navigator.clipboard.writeText(element.textContent || "");
    }
  }
}

export function FoodLogTableHeaderRows() {
  return (
    <>
      <TableRow>
        <TableCell className="">Food</TableCell>
        <TableCell className="">Amount</TableCell>
        <TableCell className="text-end">Calories</TableCell>
        <TableCell className="text-end">Carbs (g)</TableCell>
        <TableCell className="text-end">Fat (g)</TableCell>
        <TableCell className="text-end">Fiber (g)</TableCell>
        <TableCell className="text-end">Protein (g)</TableCell>
        <TableCell className="text-end">Sodium (mg)</TableCell>
      </TableRow>
    </>
  );
}

function FoodLogRow({ foodLog }: { foodLog: FoodLogEntry }) {
  const {
    logId,
    loggedFood: { name, brand, amount, unit, calories },
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
            label={formatFoodName(name, brand)}
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
      <TableCell className="text-end">
        {NUTRIENT_FORMAT.format(calories)}
      </TableCell>
      {nutritionalValues &&
        NUTRIENT_PROPS.map((prop) => (
          <TableCell key={prop} className="text-end">
            {formatNutrientPropValue(nutritionalValues, prop)}
          </TableCell>
        ))}
      {!nutritionalValues && (
        <TableCell colSpan={NUTRIENT_PROPS.length} className="text-center">
          Not available due to Fitbit API limitations
        </TableCell>
      )}
    </TableRow>
  );
}

/**
 * Display a meal type (e.g. Anytime, Breakfast, etc) and the food logs associated with it.
 */
export function MealTypeRows({ summary }: { summary: MealTypeSummary }) {
  const updateSelectedFoodLog = useSetAtom(updateSelectedFoodLogAtom);
  const showCopyIndividual = useAtomValue(foodLogShowCopyIndividualButtonAtom);

  const handleChange = function (foods: FoodLogEntry[], checked: boolean) {
    foods.map((foodLog) => updateSelectedFoodLog(foodLog, checked));
  };
  const selectedFoodLogs = useAtomValue(selectedFoodLogsAtom);
  const displayedFoods = summary.id == -1 ? [] : summary.foods;
  const checked =
    selectedFoodLogs.filter(
      (foodLog) =>
        foodLog.loggedFood.mealTypeId == summary.id || summary.id == -1
    ).size > 0;
  const indeterminate =
    checked && !summary.foods.every((foodLog) => selectedFoodLogs.has(foodLog));
  const title = !checked || indeterminate ? "Select all" : "Select none";

  return (
    <>
      <TableRow className="bg-slate-50 dark:bg-slate-900">
        <TableCell className="font-medium">
          <div className="flex flex-row items-center">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={() =>
                    handleChange(summary.foods, !checked || indeterminate)
                  }
                />
              }
              title={title}
              label={summary.name}
            />
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell className="text-end">
          {showCopyIndividual ? (
            <FlatChip
              size="small"
              icon={<ContentCopyIcon />}
              onClick={copyTextToClipboard}
              label={NUTRIENT_FORMAT.format(summary.calories)}
            />
          ) : (
            NUTRIENT_FORMAT.format(summary.calories)
          )}
        </TableCell>
        {NUTRIENT_PROPS.map((prop) => (
          <TableCell key={prop} className="text-end">
            {showCopyIndividual ? (
              <FlatChip
                size="small"
                icon={<ContentCopyIcon />}
                onClick={copyTextToClipboard}
                label={formatNutrientPropValue(summary, prop)}
              />
            ) : (
              formatNutrientPropValue(summary, prop)
            )}
          </TableCell>
        ))}
      </TableRow>
      {displayedFoods.map((foodLog) => (
        <FoodLogRow key={foodLog.logId} foodLog={foodLog} />
      ))}
    </>
  );
}

export function TotalsRow({
  foodLogsResponse,
}: {
  foodLogsResponse: GetFoodLogResponse;
}) {
  const summary: MealTypeSummary = {
    id: -1,
    name: "Total",
    foods: foodLogsResponse.foods,
    ...foodLogsResponse.summary,
  };

  return <MealTypeRows summary={summary} />;
}

export function RemainingMacrosRows({values, label}: { values: NutritionMacroGoals, label: string }) {
  return (
    <>
      <TableRow className="bg-slate-50 dark:bg-slate-900">
        <TableCell colSpan={2} className="font-medium" sx={{paddingLeft: "43px"}}>
          <div className="flex flex-row items-center">
            <Typography>{label}</Typography>
          </div>
        </TableCell>
        <TableCell className="text-end">
          <FlatChip size="small" icon={<ContentCopyIcon/>} onClick={copyTextToClipboard}
                    label={NUTRIENT_FORMAT.format(values.calories)}/>
        </TableCell>
        {NUTRIENT_PROPS.map((prop) => (
          <TableCell key={prop} className="text-end">
            <FlatChip size="small" icon={<ContentCopyIcon/>} onClick={copyTextToClipboard}
                      label={formatNutrientPropValue(values, prop)}/>
          </TableCell>
        ))}
      </TableRow>
    </>
  );
}

export function NutritionGoalsRow({values, label, unit}: {
  values: NutritionMacroGoals,
  label: string,
  unit?: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={2} sx={{paddingLeft: "43px"}}>
        <div className="flex flex-row items-center">
          <Typography>{label}</Typography>
        </div>
      </TableCell>
      <TableCell className="text-end">
        {NUTRIENT_FORMAT.format(values.calories)} {unit || ""}
      </TableCell>
      {NUTRIENT_PROPS.map((prop) => (
        <TableCell key={prop} className="text-end">
          {formatNutrientPropValue(values, prop)} {unit || ""}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function NutritionGoalsSummary({totals}: { totals: FoodLogSummary }) {
  const foodLogGoalsPosition = useAtomValue(foodLogGoalsPositionAtom);
  const foodLogTotalsPosition = useAtomValue(foodLogTotalsPositionAtom);
  const macroGoals = useAtomValue(macroGoalsAtom);

  const remainingMacros = {
    calories: macroGoals.calories - totals.calories,
    carbs: macroGoals.carbs - totals.carbs,
    fat: macroGoals.fat - totals.fat,
    fiber: macroGoals.fiber - totals.fiber,
    protein: macroGoals.protein - totals.protein,
    sodium: macroGoals.sodium - totals.sodium,
  }
  const macrosPercentages = {
    calories: totals.calories * 100 / macroGoals.calories,
    carbs: totals.carbs * 100 / macroGoals.carbs,
    fat: totals.fat * 100 / macroGoals.fat,
    fiber: totals.fiber * 100 / macroGoals.fiber,
    protein: totals.protein * 100 / macroGoals.protein,
    sodium: totals.sodium * 100 / macroGoals.sodium,
  };

  return (
    <>
      <RemainingMacrosRows values={remainingMacros} label="Remaining"/>
      <NutritionGoalsRow values={macrosPercentages} label="Nutrition goals (%)" unit="%"/>
      <NutritionGoalsRow values={macroGoals} label="Nutrition goals"/>
      {(
        // don't repeat the total line if the settings are set to display it in the same position
        (foodLogGoalsPosition != foodLogTotalsPosition && foodLogTotalsPosition != "both" && foodLogGoalsPosition != "both")
        && <NutritionGoalsRow values={totals} label="Total"/>
      )}
    </>
  );
}
