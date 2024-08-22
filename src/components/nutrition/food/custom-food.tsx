import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AutocompleteElement,
  FormContainer,
  TextFieldElement,
  useForm,
  useFormContext,
} from "react-hook-form-mui";
import { useCallback, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Typography,
} from "@mui/material";
import { atom, useAtom } from "jotai";
import { ArrowDownward } from "@mui/icons-material";
import { toast } from "mui-sonner";

import {
  buildFoodUnitsQuery,
  FoodUnit,
  NutritionalValues,
} from "@/api/nutrition";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { formatServing } from "@/utils/food-amounts";
import {
  buildCreateCustomFoodMutation,
  buildGetFoodQuery,
} from "@/api/nutrition/foods";

export const NUTRITION_FIELDS = {
  caloriesFromFat: {
    label: "Calories from fat",
    unit: "g",
  },
  totalFat: {
    label: "Total fat",
    unit: "g",
  },
  transFat: {
    label: "Trans fat",
    unit: "g",
  },
  saturatedFat: {
    label: "Saturated fat",
    unit: "g",
  },
  cholesterol: {
    label: "Cholesterol",
    unit: "mg",
  },
  sodium: {
    label: "Sodium",
    unit: "mg",
  },
  potassium: {
    label: "Potassium",
    unit: "mg",
  },
  totalCarbohydrate: {
    label: "Total carbs",
    unit: "g",
  },
  dietaryFiber: {
    label: "Dietary fiber",
    unit: "g",
  },
  sugars: {
    label: "Sugars",
    unit: "g",
  },
  protein: {
    label: "Protein",
    unit: "g",
  },
};

type FoodUnitAutocompleteOption = FoodUnit & {
  label: string;
};

interface CustomFoodFormData {
  name: string;
  brand: string;
  amount: number;
  unit?: FoodUnitAutocompleteOption;
  calories?: number;
  nutritionValues?: NutritionalValues;
}

export function CustomFoodFields() {
  const { data: allUnits } = useQuery(buildFoodUnitsQuery());
  const { watch } = useFormContext();

  const options = useMemo(() => {
    return (
      allUnits?.map((unit) => ({
        ...unit,
        label: unit.plural,
      })) ?? []
    );
  }, [allUnits]);

  const amount = watch("amount");
  const unit = watch("unit") as FoodUnitAutocompleteOption;

  const servingText =
    amount &&
    unit &&
    formatServing({
      amount,
      unit,
    });

  return (
    <FormRows marginTop={2}>
      <TextFieldElement name="name" label="Name" rules={{ required: true }} />
      <TextFieldElement name="brand" label="Brand" />

      <FormRow>
        <TextFieldElement
          name="amount"
          label="Amount"
          type="number"
          rules={{ required: true, min: 0 }}
        />
        <AutocompleteElement
          name="unit"
          label="Units"
          options={options}
          loading={!allUnits}
          autocompleteProps={{
            getOptionKey: (option) => option.id,
            isOptionEqualToValue: (option, value) => value && option.id === value.id,
          }}
          textFieldProps={{ sx: { minWidth: "297px" } }}
        />
      </FormRow>
      <TextFieldElement
        name="calories"
        label="Calories"
        type="number"
        rules={{ required: true, min: 0 }}
        helperText={servingText ? `Calories per ${servingText}` : ""}
      />
      <Accordion>
        <AccordionSummary expandIcon={<ArrowDownward />}>
          Detailed nutrition
        </AccordionSummary>
        <AccordionDetails>
          {servingText && (
            <FormRow marginBottom={4}>
              <Typography variant="body1">Per {servingText}</Typography>
            </FormRow>
          )}
          <FormRow>
            {Object.entries(NUTRITION_FIELDS).map(([id, { label, unit }]) => (
              <TextFieldElement
                key={id}
                name={`nutritionValues.${id}`}
                label={label}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">{unit}</InputAdornment>
                  ),
                }}
                sx = {{ maxWidth: "45%" }}
              />
            ))}
          </FormRow>
        </AccordionDetails>
      </Accordion>
    </FormRows>
  );
}

export const NEW_CUSTOM_FOOD = -1;

// foodId to edit existing food, -1 to create new food
export const editingCustomFoodAtom = atom<number | null>(null);

const DEFAULT_FORM_DATA = {
  name: "",
  brand: "",
  amount: 1,
  calories: undefined,
  unit: { id: 304, label: "serving", name: "serving", plural: "servings" },
  nutritionValues: {},
};

export default function CreateCustomFoodDialog() {
  const [customFoodId, setCustomFoodId] = useAtom(editingCustomFoodAtom);

  const formContext = useForm<CustomFoodFormData>({
    defaultValues: DEFAULT_FORM_DATA,
  });

  const isExistingFood = !!customFoodId && customFoodId > 0;

  const { data: food } = useQuery({
    ...buildGetFoodQuery(isExistingFood ? customFoodId : 0),
    enabled: isExistingFood,
  });

  const queryClient = useQueryClient();
  const { mutateAsync: saveCustomFood } = useMutation(
    buildCreateCustomFoodMutation(queryClient)
  );

  const save = useCallback(
    (values: CustomFoodFormData) => {
      saveCustomFood({
        foodId: isExistingFood ? customFoodId : undefined,
        name: values.name,
        brand: values.brand,
        formType: "DRY",
        calories: values.calories!,
        defaultFoodMeasurementUnitId: values.unit!.id,
        defaultServingSize: values.amount,
        nutritionalValues: {
          ...values.nutritionValues,
          calories: values.calories!,
        },
      }).then(() => {
        toast.success(`Saved custom food: ${values.name}`);
        formContext.reset();
        setCustomFoodId(null);
      });
    },
    [saveCustomFood, formContext, customFoodId, isExistingFood, setCustomFoodId]
  );

  useEffect(() => {
    if (food && food.foodId === customFoodId) {
      formContext.reset({
        name: food.name,
        brand: food.brand,
        amount: food.defaultServingSize,
        calories: food.calories,
        unit: { ...food.defaultUnit, label: food.defaultUnit?.plural },
        nutritionValues: food.nutritionalValues,
      });
    } else {
      formContext.reset(DEFAULT_FORM_DATA);
    }
  }, [food, formContext, customFoodId]);

  return (
    <Dialog
      fullWidth
      open={!!customFoodId}
      onClose={() => setCustomFoodId(null)}
    >
      <FormContainer formContext={formContext} onSuccess={save}>
        <DialogTitle>Create custom food</DialogTitle>
        <DialogContent>
          <CustomFoodFields />
          <Box marginBottom={4} />
          <DialogActions>
            <Button onClick={() => setCustomFoodId(null)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogActions>
        </DialogContent>
      </FormContainer>
    </Dialog>
  );
}
