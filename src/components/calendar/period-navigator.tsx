import { CalendarMonth, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton, Popover, Stack, Typography } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import quarterOfYearPlugin from "dayjs/plugin/quarterOfYear";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { StaticDatePicker, StaticDatePickerProps } from "@mui/x-date-pickers";

import { DateFormats } from "@/utils/date-formats";

dayjs.extend(quarterOfYearPlugin);

export interface DayjsRange {
  startDay: Dayjs;
  endDay: Dayjs;
}

export function PeriodNavigator({
  label,
  period,
  value,
  onChange,
  pickerOptions,
  disableFuture,
}: {
  label: string;
  period: "day" | "week" | "month" | "quarter" | "year";
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  pickerOptions?: StaticDatePickerProps<Dayjs>;
  disableFuture?: boolean;
}) {
  const popupState = usePopupState({
    variant: "popover",
    popupId: "period-navigator-picker",
  });

  const onNavigatePrevious = () => {
    const dayInPreviousPeriod = value.startDay.subtract(1, period as any);

    onChange({
      startDay: dayInPreviousPeriod.startOf(period),
      endDay: dayInPreviousPeriod.endOf(period),
    });
  };

  const onNavigateNext = () => {
    const dayInNextPeriod = value.startDay.add(1, period as any);

    onChange({
      startDay: dayInNextPeriod.startOf(period),
      endDay: dayInNextPeriod.endOf(period),
    });
  };

  const onPickDate = (value: Dayjs | null) => {
    if (value) {
      onChange({
        startDay: value.startOf(period),
        endDay: value.endOf(period),
      });
    }
    popupState.close();
  };

  const isLastPeriod =
    disableFuture && value.startDay.add(1, period as any).isAfter(dayjs());

  return (
    <Stack direction="row" alignItems="center">
      <IconButton aria-label="previous" onClick={onNavigatePrevious}>
        <ChevronLeft />
      </IconButton>
      <Typography variant="h5" data-testid="current-period-label">
        {label}
      </Typography>
      <IconButton
        sx={{ marginLeft: 1 }}
        aria-label="open date picker"
        onClick={popupState.open}
      >
        <CalendarMonth />
      </IconButton>
      <Popover {...bindPopover(popupState)}>
        <StaticDatePicker
          disableFuture={disableFuture}
          defaultValue={value.startDay}
          onAccept={onPickDate}
          onClose={popupState.close}
          {...pickerOptions}
        />
      </Popover>
      <IconButton
        aria-label="next"
        onClick={onNavigateNext}
        disabled={isLastPeriod}
      >
        <ChevronRight />
      </IconButton>
    </Stack>
  );
}

export function MonthNavigator({
  value,
  onChange,
  disableFuture = true,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  disableFuture?: boolean;
}) {
  return (
    <PeriodNavigator
      label={DateFormats.formatMonth(value.startDay)}
      period="month"
      value={value}
      onChange={onChange}
      pickerOptions={{
        openTo: "month",
        views: ["year", "month"],
      }}
      disableFuture={disableFuture}
    />
  );
}

export function DayNavigator({
  value,
  onChange,
  disableFuture = true,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  disableFuture?: boolean;
}) {
  return (
    <PeriodNavigator
      label={`${DateFormats.formatShortDate(value.startDay)}`}
      period="day"
      value={value}
      onChange={onChange}
      disableFuture={disableFuture}
    />
  );
}

export function WeekNavigator({
  value,
  onChange,
  disableFuture = true,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  disableFuture?: boolean;
}) {
  const label = `Week of ${DateFormats.formatWeek(value.startDay)}`;

  return (
    <PeriodNavigator
      label={label}
      period="week"
      value={value}
      onChange={onChange}
      disableFuture={disableFuture}
    />
  );
}

export function QuarterNavigator({
  value,
  onChange,
  disableFuture = true,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  disableFuture?: boolean;
}) {
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).formatRange(value.startDay.toDate(), value.endDay.toDate());

  return (
    <PeriodNavigator
      label={label}
      period="quarter"
      value={value}
      onChange={onChange}
      pickerOptions={{
        openTo: "month",
        views: ["year", "month"],
      }}
      disableFuture={disableFuture}
    />
  );
}

export function YearNavigator({
  value,
  onChange,
  disableFuture = true,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  disableFuture?: boolean;
}) {
  return (
    <PeriodNavigator
      label={`${value.startDay.get("year")}`}
      period="year"
      value={value}
      onChange={onChange}
      disableFuture={disableFuture}
    />
  );
}
