import {
  DialogContent,
  Typography,
  InputAdornment,
  Stack,
} from "@mui/material";
import { DateField } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useState } from "react";
import { DateRange, DayPicker, Button } from "react-day-picker";

import { FormRow } from "../forms/form-row";
import { PopupMenuOption, PopupMenu } from "../popup-menu";

import { DayjsRange } from "./period-navigator";

export function DateRangePicker({
  initialRange,
  onConfirm,
  onCancel,
  maxDays,
}: {
  initialRange: DayjsRange;
  onConfirm: (range: DayjsRange) => void;
  onCancel: () => void;
  maxDays?: number;
}) {
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: initialRange.startDay.toDate(),
    to: initialRange.endDay.toDate(),
  });

  const [month, setMonth] = useState(initialRange.startDay.toDate());

  const confirm = () => {
    onConfirm({
      startDay: dayjs(selected?.from),
      endDay: dayjs(selected?.to),
    });
  };

  const startDay = dayjs(selected?.from ?? "");
  const endDay = dayjs(selected?.to ?? "");

  const numDays =
    (startDay.isValid() && endDay.isValid() && endDay.diff(startDay, "days")) ??
    undefined;

  const today = dayjs();
  const isValid =
    typeof numDays === "number" &&
    (!maxDays || numDays <= maxDays) &&
    !endDay.isAfter(today, "day");

  const setStartDate = (value: Date | undefined) => {
    setSelected({ from: value, to: selected?.to });
  };

  const setEndDate = (value: Date | undefined) => {
    setSelected({ from: selected?.from, to: value });
  };

  const startDayMenuOptions: Array<PopupMenuOption> = [
    {
      id: "7days",
      label: "7 days before end",
      onClick() {
        setStartDate(
          (endDay.isValid() ? endDay : today).subtract(7, "days").toDate()
        );
      },
    },
    {
      id: "30days",
      label: "30 days before end",
      onClick() {
        setStartDate(
          (endDay.isValid() ? endDay : today).subtract(30, "days").toDate()
        );
      },
    },
    {
      id: "90days",
      label: "90 days before end",
      onClick() {
        setStartDate(
          (endDay.isValid() ? endDay : today).subtract(30, "days").toDate()
        );
      },
      hidden: !!(maxDays && maxDays < 90),
    },
  ];

  const endDayMenuOptions: Array<PopupMenuOption> = [
    {
      id: "today",
      label: "Today",
      onClick() {
        setEndDate(new Date());
      },
    },
    {
      id: "7days",
      label: "7 days after start",
      onClick() {
        setEndDate(startDay.add(7, "days").toDate());
      },
      hidden: !startDay.isValid() || today.diff(startDay, "days") < 7,
    },
    {
      id: "30days",
      label: "30 days after start",
      onClick() {
        setEndDate(startDay.add(30, "days").toDate());
      },
      hidden: !startDay.isValid() || today.diff(startDay, "days") < 30,
    },
  ];

  return (
    <DialogContent>
      <Stack direction="column" rowGap={2}>
        <Typography>
          Select up to {maxDays} days.{" "}
          {numDays ? (
            <>
              Currently selected:{" "}
              <span className={isValid ? "" : `text-red-500 font-medium`}>
                {numDays}
              </span>{" "}
              days.
            </>
          ) : null}
        </Typography>
        <FormRow>
          <DateField
            label="Start"
            value={startDay.isValid() ? startDay : undefined}
            onChange={(value) => setStartDate(value?.toDate())}
            onFocus={() => {
              if (startDay.isValid()) {
                setMonth(startDay.toDate());
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <PopupMenu options={startDayMenuOptions} />
                </InputAdornment>
              ),
            }}
          />
          <DateField
            label="End"
            value={endDay.isValid() ? endDay : undefined}
            onChange={(value) => setEndDate(value?.toDate())}
            onFocus={() => {
              if (endDay.isValid()) {
                setMonth(endDay.toDate());
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <PopupMenu options={endDayMenuOptions} />
                </InputAdornment>
              ),
            }}
          />
        </FormRow>
        <DayPicker
          selected={selected}
          onSelect={(range) => setSelected(range)}
          mode="range"
          numberOfMonths={2}
          min={2}
          month={month}
          onMonthChange={setMonth}
          required
          captionLayout="dropdown"
          disabled={{ after: new Date() }}
          startMonth={new Date(2007, 0)}
        />
        <FormRow justifyContent="end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={confirm} disabled={!isValid}>
            OK
          </Button>
        </FormRow>
      </Stack>
    </DialogContent>
  );
}
