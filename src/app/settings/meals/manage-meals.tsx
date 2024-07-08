"use client";

import {
  Button,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { useState, useCallback, useEffect, Suspense } from "react";
import {
  Controller,
  FormProvider,
  useController,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "mui-sonner";

import {
  Food,
  Meal,
  MealFood,
  buildCreateMealMutation,
  getDefaultServingSize,
  buildDeleteMealMutation,
  buildUpdateMealMutation,
} from "@/api/nutrition";
import MealSearch from "@/components/nutrition/meal/meal-search";
import { FoodServingSizeInput } from "@/components/nutrition/food/serving-size";
import SearchFoods from "@/components/nutrition/food/food-search";
import { useUnits } from "@/api/units";

export default function ManageMeals() {
  // Don't need this, just preload for now
  useUnits();

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [draftMeal, setDraftMeal] = useState<Meal | null>(null);

  const selectMeal = useCallback(
    (meal: Meal | null) => {
      setSelectedMeal(meal);
      setDraftMeal(meal);
    },
    [setDraftMeal, setSelectedMeal]
  );

  const createNewMeal = useCallback(() => {
    setSelectedMeal(null);
    setDraftMeal({
      id: "",
      name: "",
      description: "",
      mealFoods: [],
    });
  }, []);

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
          setSelectedMeal(null);
          setDraftMeal(newMeal);
        });
      }
    },
    [mutateUpdateMeal, mutateCreateMeal]
  );

  const deleteMeal = useCallback(
    (meal: Meal) => {
      mutateDeleteMeal(meal.id).then(() => {
        toast.success(`Deleted meal ${meal.name}`);
        setDraftMeal(null);
      });
    },
    [mutateDeleteMeal]
  );

  return (
    <Paper className="p-4">
      <Typography variant="h4" className="mb-8">
        Manage meals
      </Typography>
      <div className="flex flex-row gap-x-8">
        <Suspense>
          <MealSearch
            className="flex-1"
            selectedMeal={selectedMeal}
            onSelectMeal={selectMeal}
          />
        </Suspense>
        <Divider orientation="vertical" flexItem />
        <Button onClick={createNewMeal}>Create new</Button>
      </div>
      {draftMeal && (
        <>
          <Divider className="my-8" />
          <Suspense>
            {draftMeal && (
              <EditMeal
                draftMeal={draftMeal}
                onSaveMeal={saveMeal}
                onDeleteMeal={deleteMeal}
              />
            )}
          </Suspense>
        </>
      )}
    </Paper>
  );
}

interface MealFormData {
  id: string;
  name: string;
  description: string;
  foods: Array<MealFood>;
}

function EditMeal({
  draftMeal,
  onDeleteMeal,
  onSaveMeal,
}: {
  draftMeal: Meal | null;
  onDeleteMeal: (meal: Meal) => void;
  onSaveMeal: (meal: Meal) => void;
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
          <Button
            disabled={isNewMeal}
            onClick={() => onDeleteMeal(draftMeal!)}
            color="warning"
          >
            Delete meal
          </Button>
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
}: {
  index: number;
  onClickRemove: () => void;
}) {
  return (
    <Controller
      name={`foods.${index}`}
      render={({ field: { value: food, onChange } }) => (
        <TableRow key={food.foodId}>
          <TableCell>
            {food.name} {food.brand ? ` (${food.brand})` : ""}
          </TableCell>
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
          <TableCell align="right">
            <IconButton onClick={onClickRemove}>
              <DeleteIcon />
            </IconButton>
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

  return (
    <Table>
      <TableBody>
        {fields.map((arrayField, index) => (
          <FoodRow
            key={arrayField.id}
            index={index}
            onClickRemove={() => remove(index)}
          />
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>
            <AddFoodPicker addFood={(food) => append({ ...food, amount: 1 })} />
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function AddFoodPicker({ addFood }: { addFood: (food: Food) => void }) {
  const [selectedFoodToAdd, setSelectedFoodToAdd] = useState<Food | null>(null);

  const addSelectedFood = useCallback(() => {
    if (selectedFoodToAdd) {
      addFood(selectedFoodToAdd);
    }
  }, [selectedFoodToAdd, addFood]);

  return (
    <div className="flex flex-row items-center gap-x-4">
      <SearchFoods
        className="flex-1"
        value={selectedFoodToAdd}
        onChange={setSelectedFoodToAdd}
      />
      <Button disabled={!selectedFoodToAdd} onClick={addSelectedFood}>
        Add food
      </Button>
    </div>
  );
}
