import { Button, Dialog, DialogContent, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "mui-sonner";
import { FormContainer } from "react-hook-form-mui";
import {
  DatePickerElement,
  TimePickerElement,
} from "react-hook-form-mui/date-pickers";
import {
  LightModeOutlined as WakeIcon,
  BedtimeOutlined as SleepIcon,
} from "@mui/icons-material";
import { renderTimeViewClock } from "@mui/x-date-pickers";

import { buildCreateSleepLogMutation } from "@/api/sleep";

dayjs.extend(duration);

export const createSleepLogDialogOpenAtom = atom(false);

interface CreateSleepLogFormData {
  startTime: Dayjs;
  endTime: Dayjs;
}

function validateTimes(
  value: any,
  { startTime, endTime }: CreateSleepLogFormData
) {
  if (startTime.isAfter(endTime)) {
    return "Start time is after end time";
  }

  if (endTime.diff(startTime, "hours") > 24) {
    return "Sleep log must be under 24 hours";
  }
}

const RULES = { validate: { times: validateTimes } };

function CreateSleepLog({ onSaveSuccess }: { onSaveSuccess?: () => void }) {
  const formContext = useForm<CreateSleepLogFormData>({
    defaultValues: {
      startTime: dayjs().subtract(8, "hours"),
      endTime: dayjs(),
    },
    mode: "onBlur",
  });

  const { watch } = formContext;

  const queryClient = useQueryClient();

  const { mutateAsync: createSleepLog } = useMutation(
    buildCreateSleepLogMutation(queryClient)
  );

  const onSubmit = useCallback(
    (values: CreateSleepLogFormData) => {
      createSleepLog({
        startTime: values.startTime,
        endTime: values.endTime,
      }).then(
        () => {
          toast.success("Logged sleep");
          onSaveSuccess?.();
        },
        () => {
          toast.error("Error logging sleep");
        }
      );
    },
    [createSleepLog, onSaveSuccess]
  );

  const duration = dayjs.duration(watch("endTime").diff(watch("startTime")));

  return (
    <FormContainer<CreateSleepLogFormData>
      onSuccess={onSubmit}
      formContext={formContext}
    >
      <Typography variant="h4" className="mb-8 text-center">
        Log sleep
      </Typography>
      <div className="flex flex-row gap-x-8">
        <div className="flex flex-col gap-y-8">
          <div className="flex flex-row justify-center">
            <SleepIcon />
          </div>
          <DatePickerElement
            name="startTime"
            label="Start day"
            disableFuture
            rules={RULES}
          />
          <TimePickerElement
            name="startTime"
            label="Bed time"
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock,
              seconds: renderTimeViewClock,
            }}
            rules={RULES}
          />
        </div>
        <div className="flex flex-col gap-y-8">
          <div className="flex flex-row justify-center">
            <WakeIcon />
          </div>
          <DatePickerElement
            name="endTime"
            label="End day"
            disableFuture
            rules={RULES}
          />
          <TimePickerElement
            name="endTime"
            label="Wakeup time"
            rules={RULES}
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock,
              seconds: renderTimeViewClock,
            }}
          />
        </div>
      </div>
      <div className="flex flex-row justify-end mt-4">
        <Typography variant="subtitle1">
          Sleep duration{" "}
          {duration.asSeconds() > 0 ? duration.format("H[h] m[m]") : "invalid"}
        </Typography>
      </div>
      <div className="flex flex-row items-center justify-end mt-4">
        <Button type="submit">Save</Button>
      </div>
    </FormContainer>
  );
}

export default function CreateSleepLogDialog() {
  const [isOpen, setIsOpen] = useAtom(createSleepLogDialogOpenAtom);

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
      <DialogContent>
        <CreateSleepLog onSaveSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
