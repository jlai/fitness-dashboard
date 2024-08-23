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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAtomValue, useSetAtom } from "jotai";
import { usePopupState, bindPopper } from "material-ui-popup-state/hooks";
import {useCallback, ChangeEvent, MouseEvent} from "react";
import { EditOutlined as EditIcon } from "@mui/icons-material";

import { formatFoodName } from "@/utils/other-formats";
import { FRACTION_DIGITS_1 } from "@/utils/number-formats";
import { FoodLogEntry, GetFoodLogResponse } from "@/api/nutrition";

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
      display: "block"
    },
    '& .MuiChip-label': {
      paddingLeft: "6px",
    }
  },
  '& .MuiChip-label': {
    paddingLeft: "24px",
    paddingRight: 0
  },
  "& .MuiChip-icon": { display: "none" }
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
  const handleChange = function (foods: FoodLogEntry[], checked: boolean) {
    foods.map((foodLog) => updateSelectedFoodLog(foodLog, checked));
  };
  const selectedFoodLogs = useAtomValue(selectedFoodLogsAtom);
  const displayedFoods = summary.id == -1 ? [] : summary.foods;
  const checked = selectedFoodLogs.filter(
      (foodLog) => foodLog.loggedFood.mealTypeId == summary.id || summary.id == -1
  ).size > 0;
  const indeterminate = checked && !summary.foods.every((foodLog) => selectedFoodLogs.has(foodLog));
  const title = !checked || indeterminate ? "Select all" : "Select none";

  async function copyTextToClipboard(e: MouseEvent) {
    if ('clipboard' in navigator) {
      const element = e.target as Element;

      if (element && element.textContent) {
        return await navigator.clipboard.writeText(element.textContent || "");
      }
    }
  }

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
                      onChange={() => handleChange(summary.foods, !checked || indeterminate)}
                  />
                }
                title={title}
                label={summary.name}
            />
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell className="text-end">
          <FlatChip size="small" icon={<ContentCopyIcon />} onClick={copyTextToClipboard} label={NUTRIENT_FORMAT.format(summary.calories)} />
        </TableCell>
        {NUTRIENT_PROPS.map((prop) => (
          <TableCell key={prop} className="text-end">
            <FlatChip size="small" icon={<ContentCopyIcon />} onClick={copyTextToClipboard} label={formatNutrientPropValue(summary, prop)} />
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
