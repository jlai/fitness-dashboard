import {
  Button,
  Dialog,
  DialogContent,
  InputAdornment,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { atom, useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { DatePickerElement } from "react-hook-form-mui/date-pickers";

import { buildCreateWeightLogMutation } from "@/api/body";
import { useUnits } from "@/config/units";
import { WeightUnitSystem } from "@/api/user";

import { FormActionRow, FormRow, FormRows } from "../forms/form-row";
import { showSuccessToast, withErrorToaster } from "../toast";

export const createWeightLogDialogOpenAtom = atom(false);

interface CreateWeightLogFormData {
  day: Dayjs;
  weight: number;
  weightUnitSystem: WeightUnitSystem;
  percentFat: number;
}

function CreateWeightLog({ onSaveSuccess }: { onSaveSuccess?: () => void }) {
  const { localizedKilogramsName, weightUnit } = useUnits();

  const formContext = useForm<CreateWeightLogFormData>({
    defaultValues: {
      day: dayjs(),
    },
    mode: "onBlur",
  });

  const queryClient = useQueryClient();

  const { mutateAsync: createWeightLog } = useMutation(
    buildCreateWeightLogMutation(queryClient)
  );

  const onSubmit = withErrorToaster(async (values: CreateWeightLogFormData) => {
    await createWeightLog({
      day: values.day,
      weight: values.weight,
      weightUnitSystem: weightUnit,
      percentFat: values.percentFat,
    });
    showSuccessToast("Logged weight");
    onSaveSuccess?.();
  }, "Error logging weight");

  return (
    <FormContainer<CreateWeightLogFormData>
      onSuccess={onSubmit}
      formContext={formContext}
    >
      <Typography variant="h4" className="mb-8 text-center">
        Log weight
      </Typography>
      <FormRows>
        <FormRow>
          <DatePickerElement name="day" label="Date" disableFuture />
        </FormRow>
        <FormRow>
          <TextFieldElement
            name="weight"
            label="Weight"
            rules={{ required: true }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {localizedKilogramsName}
                </InputAdornment>
              ),
            }}
          />
        </FormRow>
        <FormRow>
          <TextFieldElement
            name="percentFat"
            label="Percent fat"
            helperText="Optional"
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
        </FormRow>
      </FormRows>
      <FormActionRow>
        <Button type="submit">Save</Button>
      </FormActionRow>
    </FormContainer>
  );
}

export default function CreateWeightLogDialog() {
  const [isOpen, setIsOpen] = useAtom(createWeightLogDialogOpenAtom);

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
      <DialogContent>
        <CreateWeightLog onSaveSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
