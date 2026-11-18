"use client";

import {
  ArticleOutlined,
  EditNote,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import {
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";
import { TimePickerElement } from "react-hook-form-mui/date-pickers";
import { useAtomValue, useSetAtom } from "jotai";
import { unwrap } from "jotai/utils";
import { usePopupState } from "material-ui-popup-state/hooks";
import dayjs, { type Dayjs } from "dayjs";

import {
  Food,
  NutritionLogMealType,
  buildCreateFoodLogMutation,
  nutritionLogFromMealFood,
  nutritionLogServing,
  nutritionalValuesToHealthFields,
  NutritionalValues,
} from "@/api/nutrition";
import LinkedDayElement, { DaySelectorSource } from "@/components/linked-day";
import { selectedDayForPageAtom } from "@/state";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { ServingSize } from "@/utils/food-amounts";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import NutritionPopover, {
  nutritionPopoverFoodAtom,
} from "@/components/nutrition/label/nutrition-popover";
import {
  DEFAULT_FDA_MACRO_GOALS,
  macroGoalsAtom,
  presetMealClockTimesAtom,
} from "@/storage/settings";

import { SearchFoodsElement } from "./food-search";
import {
  FoodServingSizeElement,
  FoodServingSizeInput,
  getDefaultFoodServingSize,
} from "./serving-size";
import { MealTypeElement } from "./meal-type-element";
import { commonFoodUnits } from "@/config/common-ids";

interface CreateFoodLogFormData {
  daySource: DaySelectorSource;
  food: Food | null;
  mealType: NutritionLogMealType;
  time: Dayjs | null;
  servingSize: ServingSize | null;
  customName: string;
  customCalories: string;
  customNutrients: Partial<Record<CustomNutrientKey, string>>;
}

const QUICK_CALORIES_NAME = "Quick calories";
const QUICK_LOG_NAME = "Quick log";

const SERVING_UNIT = commonFoodUnits.find((unit) => unit.name === "serving")!;
const DEFAULT_CUSTOM_SERVING: ServingSize = { amount: 1, unit: SERVING_UNIT };
const COMMON_SERVING_OPTIONS: Array<ServingSize> = commonFoodUnits.map(
  (unit) => ({ amount: 1, unit }),
);
const macroGoalsValueAtom = unwrap(
  macroGoalsAtom,
  (previous) => previous ?? DEFAULT_FDA_MACRO_GOALS,
);
const presetMealClockTimesValueAtom = unwrap(
  presetMealClockTimesAtom,
  (previous) => previous ?? { enabled: false, times: {} },
);

function defaultCustomLogName(
  calories: string | number | undefined,
  nutrients: CreateFoodLogFormData["customNutrients"] | undefined,
) {
  const hasOtherNutrients = Object.values(nutrients ?? {}).some(
    (value) => String(value ?? "").trim() !== "",
  );
  return Number(calories) > 0 && !hasOtherNutrients
    ? QUICK_CALORIES_NAME
    : QUICK_LOG_NAME;
}

const CUSTOM_NUTRIENT_FIELDS = [
  { key: "fat", label: "Total fat (g)" },
  { key: "saturatedFat", label: "Saturated fat (g)" },
  { key: "transFat", label: "Trans fat (g)" },
  { key: "monounsaturatedFat", label: "Monounsaturated fat (g)" },
  { key: "polyunsaturatedFat", label: "Polyunsaturated fat (g)" },
  { key: "unsaturatedFat", label: "Unsaturated fat (g)" },
  { key: "cholesterol", label: "Cholesterol (mg)" },
  { key: "sodium", label: "Sodium (mg)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fiber", label: "Fiber (g)" },
  { key: "sugars", label: "Sugars (g)" },
  { key: "protein", label: "Protein (g)" },
] as const;

const OTHER_NUTRIENT_FIELDS = [
  { key: "vitaminA", label: "Vitamin A (mg)" },
  { key: "vitaminB6", label: "Vitamin B6 (mg)" },
  { key: "vitaminB12", label: "Vitamin B12 (mg)" },
  { key: "vitaminC", label: "Vitamin C (mg)" },
  { key: "vitaminD", label: "Vitamin D (mg)" },
  { key: "vitaminE", label: "Vitamin E (mg)" },
  { key: "vitaminK", label: "Vitamin K (mg)" },
  { key: "biotin", label: "Biotin (mg)" },
  { key: "folate", label: "Folate (mg)" },
  { key: "folicAcid", label: "Folic acid (mg)" },
  { key: "niacin", label: "Niacin (mg)" },
  { key: "pantothenicAcid", label: "Pantothenic acid (mg)" },
  { key: "riboflavin", label: "Riboflavin (mg)" },
  { key: "thiamin", label: "Thiamin (mg)" },
  { key: "calcium", label: "Calcium (mg)" },
  { key: "copper", label: "Copper (mg)" },
  { key: "iodine", label: "Iodine (mg)" },
  { key: "iron", label: "Iron (mg)" },
  { key: "magnesium", label: "Magnesium (mg)" },
  { key: "phosphorus", label: "Phosphorus (mg)" },
  { key: "potassium", label: "Potassium (mg)" },
  { key: "zinc", label: "Zinc (mg)" },
  { key: "caffeine", label: "Caffeine (mg)" },
  { key: "chloride", label: "Chloride (mg)" },
  { key: "chromium", label: "Chromium (mg)" },
  { key: "manganese", label: "Manganese (mg)" },
  { key: "molybdenum", label: "Molybdenum (mg)" },
  { key: "selenium", label: "Selenium (mg)" },
] as const;

const ALL_CUSTOM_NUTRIENT_FIELDS = [
  ...CUSTOM_NUTRIENT_FIELDS,
  ...OTHER_NUTRIENT_FIELDS,
];

type CustomNutrientKey = (typeof ALL_CUSTOM_NUTRIENT_FIELDS)[number]["key"];

function hasMultipleServings(food: Food) {
  return (food.servings?.length ?? food.units.length) > 1;
}

export function CreateFoodLogForm() {
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  const timeWasCleared = useRef(false);
  const presetTimeWasApplied = useRef(false);
  const [customMode, setCustomMode] = useState(false);
  const [showMoreNutrients, setShowMoreNutrients] = useState(false);
  const [showOtherNutrients, setShowOtherNutrients] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [dialogServing, setDialogServing] = useState<ServingSize | null>(null);
  const [customServing, setCustomServing] = useState<ServingSize | null>(
    DEFAULT_CUSTOM_SERVING,
  );
  // Food that the custom log was copied from, used for serving options
  const [customServingFood, setCustomServingFood] = useState<Food | null>(null);
  const formContext = useForm<CreateFoodLogFormData>({
    defaultValues: {
      daySource: "today",
      food: null,
      mealType: NutritionLogMealType.ANYTIME,
      time: null,
      servingSize: null,
      customName: "",
      customCalories: "",
      customNutrients: {},
    },
  });
  const {
    formState: { isSubmitting, isLoading },
    handleSubmit,
    control,
    watch,
    reset,
  } = formContext;

  const queryClient = useQueryClient();
  const { mutateAsync: createFood } = useMutation(
    buildCreateFoodLogMutation(queryClient),
  );

  const linkedDay = useAtomValue(selectedDayForPageAtom);
  const macroGoals = useAtomValue(macroGoalsValueAtom);
  const presetMealClockTimes = useAtomValue(presetMealClockTimesValueAtom);
  const setPopoverFood = useSetAtom(nutritionPopoverFoodAtom);
  const nutritionPopupState = usePopupState({
    popupId: "food-logger-nutrition-info",
    variant: "popper",
  });
  const food = watch("food");
  const servingSize = watch("servingSize");
  const mealType = watch("mealType");

  useEffect(() => {
    if (timeWasCleared.current) {
      formContext.setValue("time", null);
      return;
    }

    const time = presetMealClockTimes.enabled
      ? presetMealClockTimes.times[mealType]
      : undefined;
    if (!time) {
      if (presetTimeWasApplied.current) {
        formContext.setValue("time", null);
        presetTimeWasApplied.current = false;
      }
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    formContext.setValue(
      "time",
      (formContext.getValues("time") ?? dayjs())
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0),
    );
    presetTimeWasApplied.current = true;
  }, [formContext, mealType, presetMealClockTimes]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(dayjs());
    const untilNextMinute =
      60_000 - dayjs().second() * 1_000 - dayjs().millisecond();
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      updateCurrentTime();
      interval = setInterval(updateCurrentTime, 60_000);
    }, untilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, []);

  const loadFoodIntoCustomLog = (food: Food, serving: ServingSize) => {
    const multiplier =
      serving.servingAmount !== undefined
        ? (serving.amount / serving.servingAmount) * (serving.multiplier ?? 1)
        : serving.amount / (food.defaultServingSize || 1);
    const base: NutritionalValues = {
      ...food.nutritionalValues,
      calories: food.nutritionalValues?.calories ?? food.calories,
    };
    const scaled = (value: number | undefined) =>
      value === undefined
        ? ""
        : String(Math.round(value * multiplier * 10) / 10);
    const nutrients: CreateFoodLogFormData["customNutrients"] = {
      fat: scaled(base.totalFat ?? base.fat),
      saturatedFat: scaled(base.saturatedFat),
      transFat: scaled(base.transFat),
      cholesterol: scaled(base.cholesterol),
      sodium: scaled(base.sodium),
      carbs: scaled(base.totalCarbohydrate ?? base.carbs),
      fiber: scaled(base.dietaryFiber ?? base.fiber),
      sugars: scaled(base.sugars),
      protein: scaled(base.protein),
      vitaminA: scaled(base.vitaminA),
      vitaminB6: scaled(base.vitaminB6),
      vitaminB12: scaled(base.vitaminB12),
      vitaminC: scaled(base.vitaminC),
      vitaminD: scaled(base.vitaminD),
      vitaminE: scaled(base.vitaminE),
      biotin: scaled(base.biotin),
      folicAcid: scaled(base.folicAcid),
      niacin: scaled(base.niacin),
      pantothenicAcid: scaled(base.pantothenicAcid),
      riboflavin: scaled(base.riboflavin),
      thiamin: scaled(base.thiamin),
      calcium: scaled(base.calcium),
      copper: scaled(base.copper),
      iodine: scaled(base.iodine),
      iron: scaled(base.iron),
      magnesium: scaled(base.magnesium),
      phosphorus: scaled(base.phosphorus),
      potassium: scaled(base.potassium),
      zinc: scaled(base.zinc),
      vitaminK: scaled(base.vitaminK),
      folate: scaled(base.folate),
      caffeine: scaled(base.caffeine),
      chloride: scaled(base.chloride),
      chromium: scaled(base.chromium),
      manganese: scaled(base.manganese),
      molybdenum: scaled(base.molybdenum),
      selenium: scaled(base.selenium),
      monounsaturatedFat: scaled(base.monounsaturatedFat),
      polyunsaturatedFat: scaled(base.polyunsaturatedFat),
      unsaturatedFat: scaled(base.unsaturatedFat),
    };

    formContext.setValue("customName", food.name);
    formContext.setValue("customCalories", scaled(base.calories));
    formContext.setValue("customNutrients", nutrients);
    const hasValue = (fields: ReadonlyArray<{ key: CustomNutrientKey }>) =>
      fields.some(({ key }) => nutrients[key]);
    setShowMoreNutrients(hasValue(CUSTOM_NUTRIENT_FIELDS));
    setShowOtherNutrients(hasValue(OTHER_NUTRIENT_FIELDS));
    setCustomServing(serving);
    setCustomServingFood(food);
    setCustomMode(true);
  };

  const resetCustomServing = () => {
    setCustomServing(DEFAULT_CUSTOM_SERVING);
    setCustomServingFood(null);
  };
  const logFood = withErrorToaster(async (values: CreateFoodLogFormData) => {
    const { food, servingSize, mealType, daySource } = values;
    const logTime = values.time ?? dayjs();
    const day = (daySource === "today" ? dayjs() : linkedDay)
      .hour(logTime.hour())
      .minute(logTime.minute())
      .second(logTime.second())
      .millisecond(logTime.millisecond());

    if (customMode) {
      const rawCalories = String(values.customCalories ?? "").trim();
      const calories = Number(rawCalories);
      if (!rawCalories || !Number.isFinite(calories)) {
        return;
      }
      const nutritionalValues: NutritionalValues = { calories };
      for (const { key } of ALL_CUSTOM_NUTRIENT_FIELDS) {
        const raw = String(values.customNutrients?.[key] ?? "").trim();
        if (raw) {
          const value = Number(raw);
          if (Number.isFinite(value)) {
            nutritionalValues[key] = value;
          }
        }
      }
      const name =
        values.customName.trim() ||
        defaultCustomLogName(values.customCalories, values.customNutrients);
      const fields = nutritionalValuesToHealthFields(nutritionalValues);

      await createFood({
        nutritionLog: {
          foodDisplayName: name,
          mealType,
          serving: nutritionLogServing(
            customServing?.amount ?? 1,
            (customServing ?? DEFAULT_CUSTOM_SERVING).unit.id,
          ),
          energy: fields.energy,
          totalCarbohydrate: fields.totalCarbohydrate,
          totalFat: fields.totalFat,
          nutrients: fields.nutrients,
        },
        day,
      });
      showSuccessToast(`Logged food: ${name}`);
      resetCustomServing();
      reset({
        food: null,
        servingSize: null,
        customName: "",
        customCalories: "",
        customNutrients: {},
        mealType,
        time: values.time,
        daySource,
      });
      return;
    }

    if (!food || !servingSize || isSubmitting) {
      return;
    }

    await createFood({
      nutritionLog: nutritionLogFromMealFood(
        { ...food, amount: servingSize.amount, unit: servingSize.unit },
        mealType,
        servingSize.servingAmount !== undefined
          ? (servingSize.amount / servingSize.servingAmount) *
              (servingSize.multiplier ?? 1)
          : undefined,
      ),
      day,
    });
    showSuccessToast(`Logged food: ${food.name}`);
    reset({
      food: null,
      servingSize: null,
      customName: "",
      customCalories: "",
      customNutrients: {},

      // Stay on existing day and mealType
      mealType: values.mealType,
      time: values.time,
      daySource,
    });
  }, "Error logging food");

  return (
    <FormContainer<CreateFoodLogFormData>
      handleSubmit={handleSubmit(logFood)}
      formContext={formContext}
    >
      <FormRows>
        <FormRow flexWrap="nowrap" columnGap={1}>
          <div className="flex-1 min-w-0">
            <SearchFoodsElement
              name="food"
              rules={{ required: !customMode }}
              onChange={(food) => {
                formContext.setValue(
                  "servingSize",
                  food ? getDefaultFoodServingSize(food) : null,
                  { shouldValidate: !!food },
                );
                if (!food) {
                  formContext.clearErrors("servingSize");
                }
              }}
            />
          </div>
          <IconButton
            aria-label="Nutrition info"
            title="Nutrition info"
            disabled={!nutritionPopupState.isOpen && (!food || !servingSize)}
            onClick={(event) => {
              if (nutritionPopupState.isOpen) {
                nutritionPopupState.close();
                return;
              }
              if (!food || !servingSize) return;
              setPopoverFood({
                foodId: food.foodId,
                food,
                nutritionLog: null,
                servingSize,
              });
              nutritionPopupState.open(event);
            }}
          >
            <ArticleOutlined />
          </IconButton>
          <IconButton
            aria-label="Set up custom log"
            title="Set up custom log"
            color={customMode ? "primary" : "default"}
            aria-pressed={customMode}
            onClick={() => {
              formContext.clearErrors();
              if (!customMode && food && servingSize) {
                setDialogServing(servingSize);
                setPromptOpen(true);
                return;
              }
              if (!customMode) {
                resetCustomServing();
              }
              setCustomMode((enabled) => !enabled);
            }}
          >
            <EditNote />
          </IconButton>
        </FormRow>
        {customMode && (
          <FormRow>
            <Typography variant="h6" className="w-full">
              Log calories or macros
            </Typography>
            <TextFieldElement
              name="customName"
              label="Name"
              placeholder={defaultCustomLogName(
                watch("customCalories"),
                watch("customNutrients"),
              )}
              size="small"
            />
            <TextFieldElement
              name="customCalories"
              label="Calories"
              type="number"
              size="small"
              required
              slotProps={{ htmlInput: { min: 0, step: "any" } }}
            />
            <IconButton
              aria-label={
                showMoreNutrients
                  ? "Hide more nutrients"
                  : "Show more nutrients"
              }
              title={
                showMoreNutrients
                  ? "Hide more nutrients"
                  : "Show more nutrients"
              }
              aria-expanded={showMoreNutrients}
              onClick={() => setShowMoreNutrients((shown) => !shown)}
            >
              {showMoreNutrients ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </FormRow>
        )}
        {customMode && (
          <Collapse in={showMoreNutrients} unmountOnExit>
            <FormRow>
              {CUSTOM_NUTRIENT_FIELDS.map(({ key, label }) => (
                <TextFieldElement
                  key={key}
                  name={`customNutrients.${key}`}
                  label={label}
                  type="number"
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: "any" } }}
                />
              ))}
            </FormRow>
          </Collapse>
        )}
        {customMode && (
          <>
            <FormRow>
              <Button
                size="small"
                aria-expanded={showOtherNutrients}
                endIcon={showOtherNutrients ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowOtherNutrients((shown) => !shown)}
              >
                Vitamins and minerals
              </Button>
            </FormRow>
            <Collapse in={showOtherNutrients} unmountOnExit>
              <FormRow>
                {OTHER_NUTRIENT_FIELDS.map(({ key, label }) => (
                  <TextFieldElement
                    key={key}
                    name={`customNutrients.${key}`}
                    label={label}
                    type="number"
                    size="small"
                    slotProps={{ htmlInput: { min: 0, step: "any" } }}
                  />
                ))}
              </FormRow>
            </Collapse>
          </>
        )}
        <FormRow>
          {customMode ? (
            <FoodServingSizeInput
              food={customServingFood}
              options={customServingFood ? undefined : COMMON_SERVING_OPTIONS}
              label="Amount (display only)"
              value={customServing}
              onChange={setCustomServing}
              minWidth="180px"
            />
          ) : (
            <FoodServingSizeElement
              name="servingSize"
              foodFieldName="food"
              minWidth="180px"
              rules={{ required: true }}
            />
          )}
          <MealTypeElement name="mealType" width={200} />
          <TimePickerElement
            name="time"
            label="Time"
            onChange={(value) => {
              timeWasCleared.current = value === null;
              presetTimeWasApplied.current = false;
            }}
            inputProps={{
              InputLabelProps: { shrink: true },
              placeholder: currentTime.format("h:mm A"),
              sx: { width: 150 },
            }}
          />
          <LinkedDayElement name="daySource" />
          <div className="flex-1"></div>
          <Button
            type="submit"
            disabled={
              (customMode
                ? String(watch("customCalories") ?? "").trim() === ""
                : !watch("food") || !watch("servingSize")) ||
              isLoading ||
              isSubmitting
            }
          >
            {customMode ? "Log custom" : "Log food"}
          </Button>
        </FormRow>
      </FormRows>
      <Dialog open={promptOpen} onClose={() => setPromptOpen(false)}>
        <DialogTitle>Create a custom log from this food?</DialogTitle>
        <DialogContent>
          <DialogContentText className="!mb-4">
            Adjust the calories or macros for this food before logging. Changes
            will only apply to this log and will not be saved elsewhere.
          </DialogContentText>
          {food && hasMultipleServings(food) && (
            <>
              <DialogContentText className="!mb-2">
                Specify a serving amount to calculate the initial
                calories/macros:
              </DialogContentText>
              <FoodServingSizeInput
                food={food}
                value={dialogServing}
                onChange={setDialogServing}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            onClick={() => {
              setPromptOpen(false);
              resetCustomServing();
              setShowMoreNutrients(false);
              setShowOtherNutrients(false);
              reset({
                ...formContext.getValues(),
                food: null,
                servingSize: null,
                customName: "",
                customCalories: "",
                customNutrients: {},
              });
              setCustomMode(true);
            }}
          >
            Start blank
          </Button>
          <Button
            disabled={!dialogServing || dialogServing.amount <= 0}
            onClick={() => {
              if (food && dialogServing) {
                loadFoodIntoCustomLog(food, dialogServing);
              }
              setPromptOpen(false);
            }}
          >
            Load from food
          </Button>
        </DialogActions>
      </Dialog>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={nutritionPopupState}
        placement="bottom"
      />
    </FormContainer>
  );
}

export default function CreateFoodLog() {
  return <CreateFoodLogForm />;
}
