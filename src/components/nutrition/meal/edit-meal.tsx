import {
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
} from "@mui/material";
import React, { useEffect, useCallback, useState } from "react";
import {
  useForm,
  useController,
  FormProvider,
  Controller,
  useFieldArray,
} from "react-hook-form";
import { ArticleOutlined, Delete as DeleteIcon } from "@mui/icons-material";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { PopupState, usePopupState } from "material-ui-popup-state/hooks";
import { useAtomValue, useSetAtom } from "jotai/index";
import { toast } from "mui-sonner";

import {
  MealFood,
  Meal,
  Food,
  getDefaultServingSize,
  buildCreateMealMutation,
  buildDeleteMealMutation,
  buildUpdateMealMutation,
} from "@/api/nutrition";
import { formatFoodName } from "@/utils/other-formats";
import NutritionPopover, { nutritionPopoverFoodAtom } from "@/components/nutrition/label/nutrition-popover";
import { macroGoalsAtom } from "@/storage/settings";

import SearchFoods from "../food/food-search";
import { FoodServingSizeInput } from "../food/serving-size";

interface MealFormData {
  id: string;
  name: string;
  description: string;
  foods: Array<MealFood>;
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
    buildCreateMealMutation(queryClient)
  );
  const { mutateAsync: mutateUpdateMeal } = useMutation(
    buildUpdateMealMutation(queryClient)
  );
  const { mutateAsync: mutateDeleteMeal } = useMutation(
    buildDeleteMealMutation(queryClient)
  );

  const saveMeal = useCallback(
    (meal: Meal) => {
      if (meal.id) {
        mutateUpdateMeal(meal).then(() => {
          toast.success(`Updated meal ${meal.name}`);
        });
      } else {
        mutateCreateMeal(meal).then((newMeal) => {
          toast.success(`Created meal ${meal.name}`);
          onUpdateMeal(newMeal, { created: true });
        });
      }
    },
    [mutateUpdateMeal, mutateCreateMeal, onUpdateMeal]
  );

  const deleteMeal = useCallback(
    (meal: Meal) => {
      mutateDeleteMeal(meal.id).then(() => {
        toast.success(`Deleted meal ${meal.name}`);
        onUpdateMeal(null);
      });
    },
    [mutateDeleteMeal, onUpdateMeal]
  );

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
    [onSaveMeal]
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
          <EditFoodList />
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
 popupState
}: {
  index: number,
  onClickRemove: () => void,
  popupState: PopupState
}) {
  const setFood = useSetAtom(nutritionPopoverFoodAtom);

  return (
    <Controller
      name={`foods.${index}`}
      render={({ field: { value: food, onChange } }) => (
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
            <Toolbar className="min-h-6 p-0" sx={{margin: "0 0 0 auto"}}>
              {(food.accessLevel == "PRIVATE") ?
                <IconButton title={"Nutrition facts"}
                  onClick={(event) => {
                    setFood({
                      // display the info for the default serving if CTRL or ALT is pressed
                      foodLog: event.ctrlKey || event.altKey ? null : {
                        loggedFood: food, logId: -1, logDate: ""
                      },
                      foodId: food.foodId,
                    });

                    if (!popupState.isOpen) {
                      popupState.open(event);
                    }
                  }}
                >
                  <ArticleOutlined />
                </IconButton> :
                <IconButton title="No data (public food)">
                  <ArticleOutlined className="opacity-30" />
                </IconButton>
              }
              <IconButton onClick={onClickRemove}>
                <DeleteIcon />
              </IconButton>
            </Toolbar>
          </TableCell>
        </TableRow>
      )}
    />
  );
}

function EditFoodList() {
  const { fields, append, remove } = useFieldArray<MealFormData>({
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
      <NutritionPopover macroGoals={macroGoals} popupState={nutritionPopupState} placement="top" />
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
