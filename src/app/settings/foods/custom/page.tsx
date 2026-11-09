"use client";

import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, ExpandMore } from "@mui/icons-material";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import { useQueryClient } from "@tanstack/react-query";
import {
  FoodAccessLevel,
  NutrientQuantityNutrient,
} from "@generated/orval/fetch/google-health-api/models";
import { useAtomValue, useSetAtom } from "jotai";
import { usePopupState } from "material-ui-popup-state/hooks";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  getDataPointIdFromName,
  mapFoodDataPoint,
  type FoodDataPoint,
} from "@/api/nutrition/helpers";
import { foodResourceName } from "@/api/nutrition/food-log";
import type { Food, NutritionMacroGoals } from "@/api/nutrition";
import { HeaderBar, FooterActionBar } from "@/components/layout/rows";
import NutritionPopover, {
  ShowLabelAction,
} from "@/components/nutrition/label/nutrition-popover";
import NutritionLabel from "@/components/nutrition/label/nutrition-label";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import {
  DEFAULT_FDA_MACRO_GOALS,
  macroGoalsAtom,
  showNutritionLabelAtom,
  useNutritionGoalsForLabelAtom,
} from "@/storage/settings";
import { formatServing } from "@/utils/food-amounts";

import { deleteCustomFoods } from "./delete-custom-foods";

const nutrients = [
  ["CARBOHYDRATES", "Carbohydrates", "g"],
  ["PROTEIN", "Protein", "g"],
  ["DIETARY_FIBER", "Dietary fiber", "g"],
  ["SUGAR", "Sugars", "g"],
  ["SATURATED_FAT", "Saturated fat", "g"],
  ["TRANS_FAT", "Trans fat", "g"],
  ["SODIUM", "Sodium", "mg"],
  ["CHOLESTEROL", "Cholesterol", "mg"],
  ["POTASSIUM", "Potassium", "mg"],
  ["CALCIUM", "Calcium", "mg"],
  ["IRON", "Iron", "mg"],
  ["BIOTIN", "Biotin", "mg"],
  ["COPPER", "Copper", "mg"],
  ["FOLIC_ACID", "Folic acid", "mg"],
  ["IODINE", "Iodine", "mg"],
  ["MAGNESIUM", "Magnesium", "mg"],
  ["NIACIN", "Niacin", "mg"],
  ["PANTOTHENIC_ACID", "Pantothenic acid", "mg"],
  ["PHOSPHORUS", "Phosphorus", "mg"],
  ["RIBOFLAVIN", "Riboflavin", "mg"],
  ["THIAMIN", "Thiamin", "mg"],
  ["VITAMIN_A", "Vitamin A", "mg"],
  ["VITAMIN_B12", "Vitamin B12", "mg"],
  ["VITAMIN_B6", "Vitamin B6", "mg"],
  ["VITAMIN_C", "Vitamin C", "mg"],
  ["VITAMIN_D", "Vitamin D", "mg"],
  ["VITAMIN_E", "Vitamin E", "mg"],
  ["ZINC", "Zinc", "mg"],
] as const satisfies ReadonlyArray<
  readonly [NutrientQuantityNutrient, string, "g" | "mg"]
>;

type NutrientKey = (typeof nutrients)[number][0];
type FormValues = {
  name: string;
  brand: string;
  description: string;
  servingAmount: string;
  servingUnit: string;
  servingUnitPlural: string;
  calories: string;
  caloriesFromFat: string;
  fat: string;
  nutrients: Record<NutrientKey, string>;
};

function numberString(value: number | undefined) {
  return value == null ? "" : String(value);
}

function initialValues(dataPoint: FoodDataPoint): FormValues {
  const food = dataPoint.food;
  const mapped = mapFoodDataPoint(dataPoint);
  const nutrientValues = Object.fromEntries(
    nutrients.map(([key, , unit]) => {
      const grams = food.nutrients?.find((item) => item.nutrient === key)
        ?.quantity?.grams;
      const value =
        key === "CARBOHYDRATES"
          ? (food.totalCarbohydrate?.grams ?? grams)
          : grams;
      return [
        key,
        numberString(
          value == null ? undefined : value * (unit === "mg" ? 1000 : 1),
        ),
      ];
    }),
  ) as Record<NutrientKey, string>;
  return {
    name: mapped.name,
    brand: food.brand ?? "",
    description: food.description ?? "",
    servingAmount: numberString(food.defaultServing?.amount),
    servingUnit: food.defaultServing?.foodMeasurementUnitDisplayName ?? "",
    servingUnitPlural:
      food.defaultServing?.foodMeasurementUnitDisplayNamePlural ?? "",
    calories: numberString(food.energyAvg?.kcal),
    caloriesFromFat: numberString(food.energyFromFat?.kcal),
    fat: numberString(food.totalFat?.grams),
    nutrients: nutrientValues,
  };
}

const optionalNonNegative = (value: string) =>
  value === "" ||
  (Number.isFinite(Number(value)) && Number(value) >= 0) ||
  "Enter a non-negative number";

export default function ManageCustomFoods() {
  const { clientOnlyFoods } = useAtomValue(clientOnlyFoodsAtom);
  const macroGoals = useAtomValue(macroGoalsAtom);
  const showNutritionLabel = useAtomValue(showNutritionLabelAtom);
  const useNutritionGoals = useAtomValue(useNutritionGoalsForLabelAtom);
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const popupState = usePopupState({
    popupId: "custom-food-nutrition",
    variant: "popper",
  });
  const selected = clientOnlyFoods.find((food) => food.name === editing);
  const columns: GridColDef<Food>[] = [
    { field: "name", headerName: "Food", flex: 2, minWidth: 140 },
    { field: "brand", headerName: "Brand", flex: 1, minWidth: 100 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 120,
      getActions: ({ id, row }) => [
        <ShowLabelAction
          key="nutrition"
          food={row}
          popupState={popupState}
          useProvidedFood
        />,
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label={`Edit ${row.name}`}
          onClick={() => {
            const dataPoint = clientOnlyFoods.find(
              (item) => getDataPointIdFromName(item.name) === id,
            );
            if (dataPoint?.name) setEditing(dataPoint.name);
          }}
        />,
      ],
    },
  ];

  const deleteSelected = withErrorToaster(async () => {
    if (deleting || selection.length === 0) return;
    setDeleting(true);
    try {
      const { confirmed } = await confirm({
        title: "Delete food templates?",
        description: "Selected foods will also be removed from favorites.",
        confirmationText: "Delete",
      });
      if (!confirmed) return;
      const usedBy = await deleteCustomFoods(selection);
      if (usedBy.length) {
        toast.error(
          `Remove these foods from the following meals first: ${usedBy.join(", ")}.`,
        );
        return;
      }
      setSelection([]);
      setEditing(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["meals"] }),
        queryClient.invalidateQueries({ queryKey: ["client-only-foods"] }),
        queryClient.invalidateQueries({ queryKey: ["favorite-foods"] }),
      ]);
      showSuccessToast("Deleted food templates");
    } finally {
      setDeleting(false);
    }
  }, "Error deleting food templates");

  return (
    <div>
      <HeaderBar className="pt-4">
        <Typography variant="h5">Food templates</Typography>
        <div className="flex-1" />
        <Button onClick={() => setEditing("new")}>Create new template</Button>
      </HeaderBar>
      <Typography className="m-4">
        Food templates let you quickly log foods that are not in Google
        Health&amp;s food database. Food templates are stored by the dashboard
        and are not synced with the Google Health app. Changes affect future
        logs and saved meals, not existing food logs.
      </Typography>
      {clientOnlyFoods.length === 0 ? (
        <Alert severity="info" className="m-4">
          There are no food templates to edit.
        </Alert>
      ) : null}
      <DataGrid<Food>
        rows={clientOnlyFoods.map((food) => mapFoodDataPoint(food))}
        columns={columns}
        getRowId={(food) => food.foodId}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={selection}
        onRowSelectionModelChange={(rows) =>
          setSelection(
            rows.filter((id): id is string => typeof id === "string"),
          )
        }
      />
      <FooterActionBar>
        <Button
          color="warning"
          disabled={!selection.length || deleting}
          onClick={deleteSelected}
        >
          Delete food templates
        </Button>
      </FooterActionBar>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={popupState}
        offset={[0, 15]}
      />
      {editing === "new" ? (
        <EditCustomFood
          key="new"
          dataPoint={{
            name: "",
            food: {
              accessLevel: FoodAccessLevel.FOOD_ACCESS_LEVEL_PRIVATE,
              defaultServing: {
                amount: 1,
                foodMeasurementUnitDisplayName: "serving",
                foodMeasurementUnitDisplayNamePlural: "servings",
              },
            },
          }}
          creating
          onClose={() => setEditing(null)}
          macroGoals={macroGoals}
          showNutritionLabel={showNutritionLabel}
          useNutritionGoals={useNutritionGoals}
        />
      ) : (
        selected && (
          <EditCustomFood
            key={selected.name}
            dataPoint={selected}
            onClose={() => setEditing(null)}
            macroGoals={macroGoals}
            showNutritionLabel={showNutritionLabel}
            useNutritionGoals={useNutritionGoals}
          />
        )
      )}
    </div>
  );
}

function EditCustomFood({
  dataPoint,
  creating = false,
  onClose,
  macroGoals,
  showNutritionLabel,
  useNutritionGoals,
}: {
  dataPoint: FoodDataPoint;
  creating?: boolean;
  onClose: () => void;
  macroGoals: NutritionMacroGoals;
  showNutritionLabel: boolean;
  useNutritionGoals: boolean;
}) {
  const setFoods = useSetAtom(clientOnlyFoodsAtom);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<FormValues>({ defaultValues: initialValues(dataPoint) });
  const values = useWatch({ control });
  const parsed = (value: string | undefined) =>
    value != null && value !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : undefined;
  const unit = creating
    ? {
        id: "",
        name: values.servingUnit ?? "",
        plural: values.servingUnitPlural ?? "",
      }
    : mapFoodDataPoint(dataPoint).defaultUnit;
  const servingText =
    unit && parsed(values.servingAmount)
      ? formatServing({ amount: Number(values.servingAmount), unit })
      : "";
  const goals = useNutritionGoals ? macroGoals : DEFAULT_FDA_MACRO_GOALS;

  const save = withErrorToaster(
    async (values: FormValues) => {
      const newName = creating ? foodResourceName(crypto.randomUUID()) : null;
      await setFoods((previous) => {
        const current =
          newName !== null
            ? { ...dataPoint, name: newName }
            : previous.clientOnlyFoods.find(
                (food) => food.name === dataPoint.name,
              );
        if (!current) throw new Error("The food no longer exists");
        if (
          creating &&
          previous.clientOnlyFoods.some((food) => food.name === newName)
        )
          throw new Error("A food with the generated ID already exists");
        const food = { ...current.food };
        if (creating || dirtyFields.name) food.displayName = values.name.trim();
        if (creating || dirtyFields.brand)
          food.brand = values.brand.trim() || undefined;
        if (creating || dirtyFields.description)
          food.description = values.description.trim() || undefined;
        if (creating || dirtyFields.servingAmount) {
          food.defaultServing = {
            ...food.defaultServing,
            amount:
              values.servingAmount === ""
                ? undefined
                : Number(values.servingAmount),
          };
        }
        if (creating) {
          food.defaultServing = {
            ...food.defaultServing,
            foodMeasurementUnitDisplayName: values.servingUnit.trim(),
            foodMeasurementUnitDisplayNamePlural:
              values.servingUnitPlural.trim(),
          };
          food.servings = [{ ...food.defaultServing, multiplier: 1 }];
        }
        if (creating || dirtyFields.calories)
          food.energyAvg =
            values.calories === ""
              ? undefined
              : { ...food.energyAvg, kcal: Number(values.calories) };
        if (creating || dirtyFields.caloriesFromFat)
          food.energyFromFat =
            values.caloriesFromFat === ""
              ? undefined
              : { ...food.energyFromFat, kcal: Number(values.caloriesFromFat) };
        if (creating || dirtyFields.fat)
          food.totalFat =
            values.fat === ""
              ? undefined
              : { ...food.totalFat, grams: Number(values.fat) };
        let updatedNutrients = food.nutrients;
        for (const [key, , unit] of nutrients) {
          if (!creating && !dirtyFields.nutrients?.[key]) continue;
          const value = values.nutrients[key];
          const grams =
            value === ""
              ? undefined
              : Number(value) / (unit === "mg" ? 1000 : 1);
          if (key === "CARBOHYDRATES") {
            food.totalCarbohydrate =
              grams == null ? undefined : { ...food.totalCarbohydrate, grams };
          }
          const existing = updatedNutrients?.find(
            (item) => item.nutrient === key,
          );
          updatedNutrients = updatedNutrients?.filter(
            (item) => item.nutrient !== key,
          );
          if (grams != null && (key !== "CARBOHYDRATES" || existing)) {
            updatedNutrients = [
              ...(updatedNutrients ?? []),
              {
                ...existing,
                nutrient: key,
                quantity: { ...existing?.quantity, grams },
              },
            ];
          }
        }
        food.nutrients = updatedNutrients;
        return {
          clientOnlyFoods: creating
            ? [...previous.clientOnlyFoods, { ...current, food }]
            : previous.clientOnlyFoods.map((item) =>
                item.name === dataPoint.name ? { ...current, food } : item,
              ),
        };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["meals"] }),
        queryClient.invalidateQueries({ queryKey: ["client-only-foods"] }),
      ]);
      onClose();
      showSuccessToast(`${creating ? "Created" : "Updated"} food template`);
    },
    `Error ${creating ? "creating" : "updating"} food template`,
  );

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="custom-food-dialog-title"
    >
      <form onSubmit={handleSubmit(save)}>
        <DialogTitle id="custom-food-dialog-title">
          {creating ? "Create food template" : "Edit food template"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} className="pt-2">
            <TextField
              label="Food name"
              required
              {...register("name", {
                validate: (value) => !!value.trim() || "Enter a food name",
              })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            {creating && (
              <>
                <TextField
                  label="Serving unit"
                  required
                  {...register("servingUnit", {
                    validate: (value) =>
                      !!value.trim() || "Enter a serving unit",
                  })}
                  error={!!errors.servingUnit}
                  helperText={
                    errors.servingUnit?.message ||
                    "Unit names are used by the dashboard and may not appear in Google Health logs."
                  }
                />
                <TextField
                  label="Serving unit (plural)"
                  required
                  {...register("servingUnitPlural", {
                    validate: (value) =>
                      !!value.trim() || "Enter a plural serving unit",
                  })}
                  error={!!errors.servingUnitPlural}
                  helperText={errors.servingUnitPlural?.message}
                />
              </>
            )}
            <TextField label="Brand" {...register("brand")} />
            <TextField label="Description" {...register("description")} />
            <TextField
              label="Default serving amount"
              type="number"
              required={creating}
              slotProps={{ htmlInput: { min: 0, step: "any" } }}
              {...register("servingAmount", {
                validate: (value) =>
                  (!creating && value === "") ||
                  (Number.isFinite(Number(value)) && Number(value) > 0) ||
                  "Enter a positive number",
              })}
              error={!!errors.servingAmount}
              helperText={
                errors.servingAmount?.message ||
                (creating
                  ? undefined
                  : `Unit: ${mapFoodDataPoint(dataPoint).defaultUnit?.name || "not specified"}`)
              }
            />
            {([["calories", "Calories (kcal)"]] as const).map(
              ([field, label]) => (
                <TextField
                  key={field}
                  label={label}
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: "any" } }}
                  {...register(field, { validate: optionalNonNegative })}
                  error={!!errors[field]}
                  helperText={
                    errors[field]?.message ||
                    (servingText ? `Calories per ${servingText}` : undefined)
                  }
                />
              ),
            )}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                Detailed nutrition
              </AccordionSummary>
              <AccordionDetails>
                {servingText && (
                  <Typography className="mb-4">Per {servingText}</Typography>
                )}
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {(
                    [
                      ["caloriesFromFat", "Calories from fat (kcal)"],
                      ["fat", "Total fat (g)"],
                    ] as const
                  ).map(([field, label]) => (
                    <TextField
                      key={field}
                      label={label}
                      type="number"
                      sx={{ flex: "1 1 190px" }}
                      slotProps={{ htmlInput: { min: 0, step: "any" } }}
                      {...register(field, { validate: optionalNonNegative })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message}
                    />
                  ))}
                  {nutrients.map(([key, label, unit]) => (
                    <TextField
                      key={key}
                      sx={{ flex: "1 1 190px" }}
                      label={`${label} (${unit})`}
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: "any" } }}
                      {...register(`nutrients.${key}`, {
                        validate: optionalNonNegative,
                      })}
                      error={!!errors.nutrients?.[key]}
                      helperText={errors.nutrients?.[key]?.message}
                    />
                  ))}
                </Stack>
                {showNutritionLabel && (
                  <div className="mt-4">
                    <NutritionLabel
                      servingText={servingText}
                      nutritionValues={{
                        calories: parsed(values.calories),
                        caloriesFromFat: parsed(values.caloriesFromFat),
                        totalFat: parsed(values.fat),
                        totalCarbohydrate: parsed(
                          values.nutrients?.CARBOHYDRATES,
                        ),
                        dietaryFiber: parsed(values.nutrients?.DIETARY_FIBER),
                        sugars: parsed(values.nutrients?.SUGAR),
                        saturatedFat: parsed(values.nutrients?.SATURATED_FAT),
                        transFat: parsed(values.nutrients?.TRANS_FAT),
                        protein: parsed(values.nutrients?.PROTEIN),
                        sodium: parsed(values.nutrients?.SODIUM),
                        potassium: parsed(values.nutrients?.POTASSIUM),
                        cholesterol: parsed(values.nutrients?.CHOLESTEROL),
                      }}
                      recommendedValues={{
                        ...goals,
                        totalFat: goals.fat,
                        totalCarbohydrate: goals.carbs,
                        dietaryFiber: goals.fiber,
                      }}
                    />
                  </div>
                )}
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {creating ? "Create food" : "Save changes"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
