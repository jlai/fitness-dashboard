import {
  Alert,
  Stack,
  TextField,
  Typography,
  Button,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableBody,
  TableFooter,
  Toolbar,
  Divider,
} from "@mui/material";
import { useEffect, useCallback, useState } from "react";
import {
  useForm,
  useController,
  FormProvider,
  Controller,
  useFieldArray,
} from "react-hook-form";
import {
  ArticleOutlined,
  Delete as DeleteIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { PopupState, usePopupState } from "material-ui-popup-state/hooks";
import { useAtomValue, useSetAtom } from "jotai/index";

import {
  MealFood,
  Meal,
  Food,
  getDefaultServingSize,
  buildCreateMealMutation,
  buildDeleteMealMutation,
  buildUpdateMealMutation,
  DEFAULT_SERVING_UNIT_ID,
  foodToDataPoint,
  mapFoodDataPoint,
} from "@/api/nutrition";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { formatFoodName } from "@/utils/other-formats";
import NutritionPopover, {
  nutritionPopoverFoodAtom,
} from "@/components/nutrition/label/nutrition-popover";
import { macroGoalsAtom } from "@/storage/settings";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import SearchFoods from "../food/food-search";
import { FoodServingSizeInput } from "../food/serving-size";

export interface MealFoodListFormData {
  foods: Array<MealFood>;
}

interface MealFormData extends MealFoodListFormData {
  id: string;
  name: string;
  description: string;
}

export function CreateOrEditMeal({
  initialMeal,
  onUpdateMeal,
  showDelete = true,
}: {
  initialMeal: Meal;
  onUpdateMeal: (meal: Meal | null, options?: { created?: boolean }) => void;
  showDelete?: boolean;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: mutateCreateMeal } = useMutation(
    buildCreateMealMutation(queryClient),
  );
  const { mutateAsync: mutateUpdateMeal } = useMutation(
    buildUpdateMealMutation(queryClient),
  );
  const { mutateAsync: mutateDeleteMeal } = useMutation(
    buildDeleteMealMutation(queryClient),
  );

  const saveMeal = withErrorToaster(async (meal: Meal) => {
    if (meal.id) {
      await mutateUpdateMeal(meal);
      showSuccessToast(`Updated meal ${meal.name}`);
    } else {
      const newMeal = await mutateCreateMeal(meal);
      showSuccessToast(`Created meal ${meal.name}`);
      onUpdateMeal(newMeal, { created: true });
    }
  }, "Error creating or updating meal");

  const deleteMeal = withErrorToaster(async (meal: Meal) => {
    await mutateDeleteMeal(meal.id);
    showSuccessToast(`Deleted meal ${meal.name}`);
    onUpdateMeal(null);
  }, "Error deleting meal");

  return (
    <EditMeal
      showDelete={showDelete}
      draftMeal={initialMeal}
      onSaveMeal={saveMeal}
      onDeleteMeal={deleteMeal}
    />
  );
}

export function EditMeal({
  draftMeal,
  onDeleteMeal,
  onSaveMeal,
  showDelete = true,
}: {
  draftMeal: Meal | null;
  onDeleteMeal: (meal: Meal) => void;
  onSaveMeal: (meal: Meal) => void;
  showDelete?: boolean;
}) {
  const form = useForm<MealFormData>({
    defaultValues: { id: "", name: "", description: "", foods: [] },
  });
  const { handleSubmit, reset, control } = form;

  const { field: nameFieldProps } = useController({
    name: "name",
    control,
    rules: {
      required: true,
    },
  });

  const { field: descriptionFieldProps } = useController({
    name: "description",
    control,
  });

  useEffect(() => {
    reset({
      id: draftMeal?.id,
      name: draftMeal?.name,
      description: draftMeal?.description,
      foods: draftMeal?.mealFoods || [],
    });
  }, [reset, draftMeal]);

  const onSubmit = useCallback(
    (values: MealFormData) => {
      const meal = {
        id: values.id,
        name: values.name,
        description: values.description,
        mealFoods: values.foods,
      };

      onSaveMeal(meal);
    },
    [onSaveMeal],
  );

  const isNewMeal = !form.getValues().id;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-row items-center gap-x-4 mb-8">
          <TextField
            label="Meal name"
            className="w-[350px]"
            {...nameFieldProps}
          />
          <TextField label="Description" fullWidth {...descriptionFieldProps} />
        </div>
        <div>
          <Typography variant="h5" className="mb-4">
            Foods in meal
          </Typography>
          <MealFoodListEditor />
        </div>
        <div className="flex flex-row items-center mt-8 justify-end gap-x-4">
          {showDelete && (
            <Button
              disabled={isNewMeal}
              onClick={() => onDeleteMeal(draftMeal!)}
              color="warning"
            >
              Delete meal
            </Button>
          )}
          <Button disabled={!form.formState.isValid} type="submit">
            {isNewMeal ? "Create meal" : "Update meal"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function FoodRow({
  index,
  onClickRemove,
  popupState,
}: {
  index: number;
  onClickRemove: () => void;
  popupState: PopupState;
}) {
  const setFood = useSetAtom(nutritionPopoverFoodAtom);
  const [showReplacement, setShowReplacement] = useState(false);

  return (
    <Controller
      name={`foods.${index}`}
      render={({ field: { value: food, onChange } }) => (
        <>
          <TableRow key={food.foodId}>
            <TableCell>{formatFoodName(food.name, food.brand)}</TableCell>
            <TableCell className="w-8">
              <FoodServingSizeInput
                food={food}
                value={getDefaultServingSize(food)}
                onChange={(servingSize) =>
                  servingSize &&
                  onChange({
                    ...food,
                    amount: servingSize.amount,
                    unit: servingSize.unit,
                  })
                }
              />
            </TableCell>
            <TableCell className="w-1/12">
              <Toolbar className="min-h-6 p-0" sx={{ margin: "0 0 0 auto" }}>
                {!food.foodNotFound ? (
                  <IconButton
                    title={"Nutrition facts"}
                    onClick={(event) => {
                      if (popupState.isOpen) {
                        popupState.close();
                        return;
                      }
                      setFood({
                        // display the info for the default serving if CTRL or ALT is pressed
                        nutritionLog:
                          event.ctrlKey || event.altKey
                            ? null
                            : {
                                foodDisplayName: food.name,
                                energy: { kcal: food.calories },
                                serving: {
                                  amount: food.amount,
                                  foodMeasurementUnitDisplayName:
                                    food.unit?.name,
                                },
                              },
                        foodId: food.foodId,
                        food,
                      });

                      popupState.open(event);
                    }}
                  >
                    <ArticleOutlined />
                  </IconButton>
                ) : (
                  <IconButton
                    aria-label="Replace missing food"
                    title="Replace missing food"
                    color="warning"
                    onClick={() => setShowReplacement((shown) => !shown)}
                  >
                    <WarningAmberIcon />
                  </IconButton>
                )}
                <IconButton onClick={onClickRemove}>
                  <DeleteIcon />
                </IconButton>
              </Toolbar>
            </TableCell>
          </TableRow>
          {food.foodNotFound && showReplacement && (
            <TableRow>
              <TableCell colSpan={3}>
                <MissingFoodReplacement
                  onReplace={(replacement) => {
                    onChange(replacement);
                    setShowReplacement(false);
                  }}
                />
              </TableCell>
            </TableRow>
          )}
        </>
      )}
    />
  );
}

function MissingFoodReplacement({
  onReplace,
}: {
  onReplace: (food: MealFood) => void;
}) {
  const queryClient = useQueryClient();
  const setClientOnlyFoods = useSetAtom(clientOnlyFoodsAtom);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");

  const createTemplate = withErrorToaster(async () => {
    const trimmedName = name.trim();
    const caloriesValue = Number(calories);
    if (
      !trimmedName ||
      calories === "" ||
      !Number.isFinite(caloriesValue) ||
      caloriesValue < 0
    ) {
      return;
    }

    const servingUnit = {
      id: DEFAULT_SERVING_UNIT_ID,
      name: "serving",
      plural: "servings",
    };
    const dataPoint = foodToDataPoint({
      accessLevel: "PRIVATE",
      foodId: crypto.randomUUID(),
      name: trimmedName,
      calories: caloriesValue,
      defaultServingSize: 1,
      defaultUnit: servingUnit,
      unit: servingUnit,
      servings: [{ multiplier: 1, servingSize: 1, unit: servingUnit }],
      units: [servingUnit.id],
    });

    await setClientOnlyFoods((previous) => ({
      clientOnlyFoods: [...previous.clientOnlyFoods, dataPoint],
    }));
    await queryClient.invalidateQueries({
      queryKey: ["client-only-foods"],
    });
    onReplace({ ...mapFoodDataPoint(dataPoint), amount: 1 });
    showSuccessToast(`Created food template ${trimmedName}`);
  }, "Error creating food template");

  return (
    <Stack spacing={2} className="py-2">
      <Alert severity="warning">
        The associated food could not be found. Replace with another food?
      </Alert>
      <div className="flex flex-row items-center gap-x-4">
        <SearchFoods
          className="flex-1"
          value={selectedFood}
          onChange={setSelectedFood}
        />
        <Button
          type="button"
          disabled={!selectedFood}
          onClick={() => {
            if (selectedFood) {
              onReplace({
                ...selectedFood,
                amount: selectedFood.defaultServingSize ?? 1,
                unit: selectedFood.defaultUnit ?? selectedFood.unit,
              });
            }
          }}
        >
          Replace food
        </Button>
      </div>
      <Divider />
      <Typography variant="subtitle1">Create a new food template</Typography>
      <div className="flex flex-row items-center gap-x-4">
        <TextField
          required
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1"
        />
        <TextField
          required
          label="Calories"
          type="number"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          slotProps={{ htmlInput: { min: 0, step: "any" } }}
        />
        <Button
          type="button"
          disabled={
            !name.trim() ||
            calories === "" ||
            !Number.isFinite(Number(calories)) ||
            Number(calories) < 0
          }
          onClick={createTemplate}
        >
          Create and replace
        </Button>
      </div>
    </Stack>
  );
}

export function MealFoodListEditor() {
  const { fields, append, remove } = useFieldArray<MealFoodListFormData>({
    name: "foods",
    rules: {
      minLength: 1,
    },
  });
  const nutritionPopupState = usePopupState({
    popupId: "show-nutrition-facts-popup",
    variant: "popper",
  });
  const macroGoals = useAtomValue(macroGoalsAtom);

  return (
    <>
      <NutritionPopover
        macroGoals={macroGoals}
        popupState={nutritionPopupState}
        placement="top"
      />
      <Table>
        <TableBody>
          {fields.map((arrayField, index) => (
            <FoodRow
              key={arrayField.id}
              index={index}
              popupState={nutritionPopupState}
              onClickRemove={() => remove(index)}
            />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>
              <AddFoodPicker
                addFood={(food) =>
                  append({
                    ...food,
                    amount: food.defaultServingSize ?? 1,
                    unit: food.defaultUnit ?? food.unit,
                  })
                }
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
}

function AddFoodPicker({ addFood }: { addFood: (food: Food) => void }) {
  const [selectedFoodToAdd, setSelectedFoodToAdd] = useState<Food | null>(null);

  const handleAddSelectedFoodClicked = () => {
    if (selectedFoodToAdd) {
      addFood(selectedFoodToAdd);
    }
  };

  return (
    <div className="flex flex-row items-center gap-x-4">
      <SearchFoods
        className="flex-1"
        value={selectedFoodToAdd}
        onChange={setSelectedFoodToAdd}
      />
      <Button
        disabled={!selectedFoodToAdd}
        onClick={handleAddSelectedFoodClicked}
      >
        Add food
      </Button>
    </div>
  );
}
