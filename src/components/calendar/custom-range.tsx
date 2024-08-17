import {
  FormControl,
  InputBaseComponentProps,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import React, { useId } from "react";
import {
  bindDialog,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

import { ResponsiveDialog } from "../dialogs/responsive-dialog";

import { DayjsRange } from "./period-navigator";
import { DateRangePicker } from "./date-range-picker";

import "react-day-picker/style.css";

type DateRangeInputProps = InputBaseComponentProps & {
  value: DayjsRange;
  onSelect: (range: DayjsRange) => void;
  maxDays?: number;
};

const DATE = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DateRangeInput = React.forwardRef<HTMLButtonElement, DateRangeInputProps>(
  function DateRangeInput({ value, onSelectRange, maxDays }, ref) {
    const popupState = usePopupState({
      variant: "dialog",
      popupId: "date-range-picker",
    });

    return (
      <>
        <button ref={ref} className="m-4" {...bindTrigger(popupState)}>
          {DATE.format(value.startDay.toDate())} &ndash;{" "}
          {DATE.format(value.endDay.toDate())}
        </button>
        {popupState.isOpen ? (
          <ResponsiveDialog
            title="Select custom range"
            showCloseButton={false}
            showFullScreenToggle={false}
            {...bindDialog(popupState)}
          >
            <DateRangePicker
              initialRange={value}
              maxDays={maxDays}
              onConfirm={(value) => {
                onSelectRange(value);
                popupState.close();
              }}
              onCancel={popupState.close}
            />
          </ResponsiveDialog>
        ) : null}
      </>
    );
  }
);

interface CustomRangePickerProps {
  value: DayjsRange;
  onChange: (range: DayjsRange) => void;
  maxDays?: number;
}

export function CustomRangePicker({
  value,
  onChange,
  maxDays,
}: CustomRangePickerProps) {
  const inputId = useId();
  const label = "Custom range";

  return (
    <>
      <FormControl variant="outlined">
        <InputLabel htmlFor={inputId} shrink>
          {label}
        </InputLabel>
        <OutlinedInput
          id={inputId}
          label={label}
          value={value}
          inputComponent={DateRangeInput}
          inputProps={{ onSelectRange: onChange, maxDays }}
        />
      </FormControl>
    </>
  );
}
