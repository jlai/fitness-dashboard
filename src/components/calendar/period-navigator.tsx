import { CalendarMonth, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton, Popover, Stack, Typography } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import quarterOfYearPlugin from "dayjs/plugin/quarterOfYear";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { StaticDatePicker } from "@mui/x-date-pickers";

import { formatMonth, formatWeek } from "@/utils/date-formats";

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
  pickerViews,
}: {
  label: string;
  period: "day" | "week" | "month" | "quarter" | "year";
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
  pickerViews?: Array<"day" | "month" | "year">;
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
          defaultValue={value.startDay}
          onAccept={onPickDate}
          views={pickerViews}
        />
      </Popover>
      <IconButton aria-label="next" onClick={onNavigateNext}>
        <ChevronRight />
      </IconButton>
    </Stack>
  );
}

export function MonthNavigator({
  value,
  onChange,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
}) {
  return (
    <PeriodNavigator
      label={formatMonth(value.startDay)}
      period="month"
      value={value}
      onChange={onChange}
      pickerViews={["month", "year"]}
    />
  );
}

export function WeekNavigator({
  value,
  onChange,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
}) {
  const label = `Week of ${formatWeek(value.startDay)}`;

  return (
    <PeriodNavigator
      label={label}
      period="week"
      value={value}
      onChange={onChange}
    />
  );
}

export function QuarterNavigator({
  value,
  onChange,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
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
      pickerViews={["month", "year"]}
    />
  );
}

export function YearNavigator({
  value,
  onChange,
}: {
  value: DayjsRange;
  onChange: (updated: DayjsRange) => void;
}) {
  return (
    <PeriodNavigator
      label={`${value.startDay.get("year")}`}
      period="year"
      value={value}
      onChange={onChange}
    />
  );
}
