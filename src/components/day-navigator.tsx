"use client";

import { useCallback, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { DateCalendar } from "@mui/x-date-pickers";
import { ChevronLeft, ChevronRight, CalendarMonth } from "@mui/icons-material";
import { IconButton, Popover, Typography } from "@mui/material";
import localizedFormats from "dayjs/plugin/localizedFormat";
import { PickerSelectionState } from "@mui/x-date-pickers/internals";

dayjs.extend(localizedFormats);

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
});

const SAME_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
});

const OTHER_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
});

function getLabel(day: Dayjs) {
  const today = dayjs();

  if (day.isSame(today, "day")) {
    return "Today";
  }

  const yesterday = today.subtract(1, "day");
  if (day.isSame(yesterday, "day")) {
    return "Yesterday";
  }

  if (day.isSame(today, "week")) {
    return WEEKDAY_FORMATTER.format(day.toDate());
  }

  if (day.isSame(today, "year")) {
    return SAME_YEAR_FORMATTER.format(day.toDate());
  }

  return OTHER_YEAR_FORMATTER.format(day.toDate());
}

export default function DayNavigator({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: Dayjs;
  onSelectDay: (day: Dayjs) => void;
}) {
  const today = dayjs();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const openDatePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const closeDatePicker = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  const selectPreviousDay = useCallback(() => {
    onSelectDay(selectedDay.subtract(1, "day"));
  }, [selectedDay, onSelectDay]);

  const selectNextDay = useCallback(() => {
    onSelectDay(selectedDay.add(1, "day"));
  }, [selectedDay, onSelectDay]);

  const handleChange = useCallback(
    (value: Dayjs | null, state: PickerSelectionState | undefined) => {
      if (state === "finish") {
        if (value) {
          onSelectDay(value);
        }
      }
    },
    [onSelectDay]
  );

  const label = getLabel(selectedDay);
  const isToday = selectedDay.isSame(today, "day");

  return (
    <div className="flex flex-row items-center">
      <IconButton aria-label="previous day" onClick={selectPreviousDay}>
        <ChevronLeft />
      </IconButton>
      <div className="flex flex-row items-center mx-2">
        <Typography variant="h5" data-testid="current-day-label">
          {label}
        </Typography>
        <IconButton
          sx={{ marginLeft: 1 }}
          onClick={openDatePicker}
          aria-label="open date picker"
        >
          <CalendarMonth />
        </IconButton>
        <Popover
          open={!!anchorEl}
          onClose={closeDatePicker}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <DateCalendar
            value={selectedDay}
            onChange={handleChange}
            disableFuture
          />
        </Popover>
      </div>
      <IconButton
        aria-label="next day"
        onClick={selectNextDay}
        disabled={isToday}
      >
        <ChevronRight />
      </IconButton>
    </div>
  );
}
