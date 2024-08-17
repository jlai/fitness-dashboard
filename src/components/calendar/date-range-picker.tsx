import {
  DialogContent,
  Typography,
  InputAdornment,
  Stack,
  IconButton,
  IconButtonProps,
} from "@mui/material";
import { DateField } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useState } from "react";
import { DateRange, DayPicker, Button } from "react-day-picker";
import { ArrowDropDown } from "@mui/icons-material";

import { FormRow } from "../forms/form-row";
import { PopupMenuOption, PopupMenu } from "../popup-menu";

import { DayjsRange } from "./period-navigator";

const DateMenuButton = (props: Partial<IconButtonProps>) => (
  <IconButton {...props} aria-label="set date actions">
    <ArrowDropDown />
  </IconButton>
);

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

  const endOrToday = endDay.isValid() ? endDay : today;

  const startDayMenuOptions: Array<PopupMenuOption> = [
    {
      id: "7days",
      label: "7 days before end",
      onClick() {
        setStartDate(endOrToday.subtract(7, "days").toDate());
      },
    },
    {
      id: "30days",
      label: "30 days before end",
      onClick() {
        setStartDate(endOrToday.subtract(30, "days").toDate());
      },
    },
    {
      id: "90days",
      label: "90 days before end",
      onClick() {
        setStartDate(endOrToday.subtract(30, "days").toDate());
      },
      hidden: !!(maxDays && maxDays < 90),
    },
    {
      id: "startOfYear",
      label: "Start of year",
      onClick() {
        setStartDate(endOrToday.startOf("year").toDate());
      },
      hidden: !!(
        maxDays && endOrToday.diff(endOrToday.startOf("year"), "days") > maxDays
      ),
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
            disableFuture
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
                  <PopupMenu
                    options={startDayMenuOptions}
                    ButtonComponent={DateMenuButton}
                  />
                </InputAdornment>
              ),
            }}
          />
          <DateField
            label="End"
            disableFuture
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
                  <PopupMenu
                    options={endDayMenuOptions}
                    ButtonComponent={DateMenuButton}
                  />
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
