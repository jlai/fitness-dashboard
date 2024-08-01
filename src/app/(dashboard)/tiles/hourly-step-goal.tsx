import { useSuspenseQuery } from "@tanstack/react-query";
import { useParentSize } from "@visx/responsive";
import { scaleBand } from "@visx/scale";
import { Group } from "@visx/group";
import { Text } from "@visx/text";
import { range as d3Range } from "d3-array";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormLabel,
  InputAdornment,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useInterval } from "react-use";
import {
  Controller,
  FormContainer,
  SelectElement,
  SelectElementProps,
  TextFieldElement,
} from "react-hook-form-mui";
import dayjs from "dayjs";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { FormRow, FormRows } from "@/components/forms/form-row";
import { usePortalTooltip } from "@/components/charts/visx/tooltip";

import { useSelectedDay } from "../state";

import { RenderDialogContentProps, TileWithDialog } from "./tile-with-dialog";
import { useTileScale, useTileSettings } from "./tile";

const MIN_HOURS = 5;
const MAX_HOURS = 14;

const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
});

function formatHour(hour: number) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDay(), hour);

  return HOUR_FORMAT.format(date);
}

type HourlyStepGoalTileStyle = "dots";

interface HourlyStepGoalTileSettings {
  startHour: number;
  endHour: number;
  hourlyStepGoal: number;
  refetchIntervalMinutes: number;
  style: HourlyStepGoalTileStyle;
}

const DEFAULT_SETTINGS: HourlyStepGoalTileSettings = {
  startHour: 9,
  endHour: 17,
  hourlyStepGoal: 250,
  refetchIntervalMinutes: 10,
  style: "dots",
};

const REFETCH_INTERVAL_OPTIONS: SelectElementProps<
  HourlyStepGoalTileSettings,
  "refetchIntervalMinutes"
>["options"] = [
  { id: 5, label: "5 minutes" },
  { id: 10, label: "10 minutes" },
  { id: 15, label: "15 minutes" },
];

const STYLE_OPTIONS = [{ id: "dots", label: "Dots" }];

function assertValidHours(startHour: number, endHour: number) {
  if (startHour > endHour) {
    throw new Error(
      `startHour (${startHour}) cannot be after endHour (${endHour})`
    );
  }
}

export default function HourlyStepGoalTileContent() {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [settings] =
    useTileSettings<HourlyStepGoalTileSettings>(DEFAULT_SETTINGS);
  const { startHour, endHour, hourlyStepGoal, refetchIntervalMinutes, style } =
    settings;
  const { h } = useTileScale();

  // Redraw every 30 seconds to catch hour changes
  useInterval(() => {
    setCurrentHour(new Date().getHours());
  }, 30 * 1000);

  const day = useSelectedDay();
  const { data } = useSuspenseQuery({
    ...buildActivityIntradayQuery(
      "steps",
      "15min",
      day.startOf("day"),
      day.endOf("day")
    ),
    refetchInterval: Math.max(1.0, refetchIntervalMinutes) * 60 * 1000,
  });

  const stepsByHour = useMemo(() => {
    const stepsByHour = new Map<number, number>();

    for (const entry of aggregateByHour(data)) {
      stepsByHour.set(entry.dateTime.getHours(), entry.value);
    }

    return stepsByHour;
  }, [data]);

  // Count hours within the time range
  const hours = endHour - startHour;
  let hoursMetGoal = 0;

  assertValidHours(startHour, endHour);
  for (let hour = startHour; hour < endHour; hour++) {
    const steps = stepsByHour.get(hour) ?? 0;
    if (steps >= hourlyStepGoal) {
      hoursMetGoal++;
    }
  }

  const isToday = dayjs().isSame(day, "day");
  const isWithinRange =
    isToday && currentHour >= startHour && currentHour < endHour;
  const currentHourSteps = stepsByHour.get(currentHour);
  const stepsRemaining = Math.max(0, hourlyStepGoal - (currentHourSteps ?? 0));

  return (
    <TileWithDialog
      dialogComponent={HourlyStepGoalDialogContent}
      dialogProps={{ maxWidth: "lg" }}
    >
      <Stack
        direction="column"
        height="100%"
        alignItems="center"
        justifyContent="center"
        padding={1}
      >
        <GoalStatus hours={hours} hoursMetGoal={hoursMetGoal} />
        {style === "dots" && (
          <HourlyDots settings={settings} stepsByHour={stepsByHour} />
        )}
        {hoursMetGoal >= hours && h > 1 && (
          <Typography>You met your daily goal!</Typography>
        )}
        {hoursMetGoal < hours && isWithinRange && h > 1 && (
          <Typography>
            {stepsRemaining > 0 && (
              <span>
                {FRACTION_DIGITS_0.format(stepsRemaining)} steps to go this hour
              </span>
            )}
            {stepsRemaining === 0 && (
              <span>You met your goal for this hour!</span>
            )}
          </Typography>
        )}
      </Stack>
    </TileWithDialog>
  );
}

interface HourlyDotTooltipData {
  hour: number;
  steps: number;
}

function HourlyDots({
  settings: { startHour, endHour, hourlyStepGoal },
  stepsByHour,
}: {
  settings: HourlyStepGoalTileSettings;
  stepsByHour: Map<number, number>;
}) {
  const { parentRef, width, height } = useParentSize({
    debounceTime: 50,
  });
  const { scale: tileScale } = useTileScale();
  const {
    containerRef,
    TooltipInPortal,
    tooltipLeft,
    tooltipTop,
    handleMouseMove,
    hideTooltip,
    tooltipOpen,
    tooltipData,
  } = usePortalTooltip<HourlyDotTooltipData>();

  const marginBottom = tileScale > 1 ? 40 : 0;
  const effectiveHeight = height - marginBottom;

  const xScale = scaleBand({
    domain: d3Range(startHour, endHour),
    range: [-Math.PI / 2, Math.PI / 2],
    padding: 0.2,
  });

  const circles: Array<React.ReactNode> = [];
  const labels: Array<React.ReactNode> = [];
  let metGoalHours = 0;

  assertValidHours(startHour, endHour);
  for (let hour = startHour; hour < endHour; hour++) {
    const steps = stepsByHour.get(hour) ?? 0;
    const metGoal = steps >= hourlyStepGoal;

    const startAngle = xScale(hour)!;

    const midAngle = startAngle + xScale.bandwidth() / 2;
    const radius = Math.min(width, effectiveHeight * 2) / 2.5;

    const x = radius * Math.cos(midAngle - Math.PI / 2);
    const y = radius * Math.sin(midAngle - Math.PI / 2);

    if (metGoal) {
      metGoalHours++;
    }

    circles.push(
      <circle
        key={`circle-${hour}`}
        cx={x}
        cy={y}
        r={tileScale * 4}
        fill={metGoal ? "red" : "#d4d4d8"}
        onMouseMove={(event) => handleMouseMove(event, { hour, steps })}
        onMouseOut={hideTooltip}
      />
    );

    if (hour === startHour || hour === endHour - 1) {
      labels.push(
        <Text
          key={`label-${hour}`}
          textAnchor="middle"
          verticalAnchor="start"
          x={x}
          y={y + 30}
          fill="currentColor"
        >
          {formatHour(hour)}
        </Text>
      );
    }
  }

  const hours = endHour - startHour;
  const metDailyGoal = metGoalHours >= hours;

  return (
    <div
      ref={parentRef}
      className="group w-full flex-1 min-h-0 max-h-[50%] my-4"
    >
      <svg ref={containerRef} width={width} height={height}>
        <Group left={width / 2} top={effectiveHeight}>
          {circles}
          {tileScale > 1 && labels}
        </Group>
        {tileScale > 1 && (
          <g
            transform={`translate(${width / 2} ${effectiveHeight}) translate(${
              -12 * tileScale
            } -${10 * tileScale})`}
            className={
              metDailyGoal
                ? "group-hover:motion-safe:animate-wobble-z origin-bottom"
                : ""
            }
          >
            <path
              className={
                metDailyGoal ? "#90ee02" : "fill-[#5f6368] dark:fill-current"
              }
              transform={`scale(${tileScale})`}
              d="M13 2a2 2 0 1 0 0 4c1.11 0 2-.89 2-2a2 2 0 0 0-2-2M4 7v2h6v6l-5.07 5.07l1.41 1.43l6.72-6.73L17 17.13V21h2v-4.43c0-.36-.18-.68-.5-.86L15 13.6V9h6V7z"
            />
          </g>
        )}
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          className="min-w-max z-[1500]"
        >
          <Stack
            direction="column"
            alignItems="center"
            justifyContent="center"
            margin={1}
            rowGap={1}
          >
            <Typography variant="h6">{formatHour(tooltipData.hour)}</Typography>
            <Typography>
              {FRACTION_DIGITS_0.format(tooltipData.steps)} steps
            </Typography>
          </Stack>
        </TooltipInPortal>
      )}
    </div>
  );
}

function GoalStatus({
  hours,
  hoursMetGoal,
}: {
  hours: number;
  hoursMetGoal: number;
}) {
  const { scale } = useTileScale();
  const boldText = scale === 1 ? "text-md font-medium" : "text-2xl font-medium";
  const normalText = scale === 1 ? "text-sm" : "text-lg";

  return (
    <Stack
      direction="row"
      marginInline={2}
      justifyContent="center"
      alignItems="baseline"
      flexWrap="wrap"
    >
      <Typography className={boldText} marginInline={1}>
        {hoursMetGoal}
      </Typography>
      <Typography className={normalText}> of </Typography>
      <Typography className={boldText} marginInline={1}>
        {hours}
      </Typography>
      <Typography className={normalText}> hours</Typography>
    </Stack>
  );
}

interface HourlyStepGoalsFormData {
  style: HourlyStepGoalTileStyle;
  hourRange: [number, number];
  hourlyStepGoal: number;
  refetchIntervalMinutes: number;
}

function HourlyStepGoalDialogContent(props: RenderDialogContentProps) {
  const [settings, setSettings] =
    useTileSettings<HourlyStepGoalTileSettings>(DEFAULT_SETTINGS);

  const marks = [6, 9, 17, 22].map((hour) => ({
    value: hour,
    label: formatHour(hour),
  }));

  const handleSubmit = (values: HourlyStepGoalsFormData) => {
    const [startHour, endHour] = values.hourRange;

    if (startHour > endHour) {
      throw new Error("startHour cannot be after endHour");
    }

    setSettings({
      ...settings,
      startHour,
      endHour,
      hourlyStepGoal: values.hourlyStepGoal,
      refetchIntervalMinutes: values.refetchIntervalMinutes,
    });

    props.close();
  };

  return (
    <FormContainer<HourlyStepGoalsFormData>
      onSuccess={handleSubmit}
      defaultValues={{
        hourlyStepGoal: settings.hourlyStepGoal,
        hourRange: [settings.startHour, settings.endHour],
        refetchIntervalMinutes: settings.refetchIntervalMinutes,
        style: settings.style,
      }}
    >
      <DialogTitle>Hourly step goal</DialogTitle>
      <DialogContent>
        <Typography>
          Show your hourly step progress on this dashboard.
        </Typography>
        <Typography>
          This is separate from any reminders to move on your watch/tracker.
        </Typography>
        <FormRows marginTop={2}>
          <FormRow marginTop={1}>
            <TextFieldElement
              name="hourlyStepGoal"
              label="Hourly goal"
              type="number"
              rules={{ min: 100, max: 1000 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">steps</InputAdornment>
                ),
              }}
            />
            <SelectElement
              name="refetchIntervalMinutes"
              label="Refresh frequency"
              options={REFETCH_INTERVAL_OPTIONS}
              sx={{
                minWidth: "150px",
              }}
            />
            <SelectElement
              name="style"
              label="Style"
              options={STYLE_OPTIONS}
              sx={{
                minWidth: "150px",
              }}
            />
          </FormRow>
          <FormRow className="w-full px-4">
            <FormLabel>Track goal between these hours</FormLabel>
            <Controller
              name="hourRange"
              render={({ field }) => (
                <Slider
                  {...field}
                  step={1}
                  min={0}
                  max={24}
                  marks={marks}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatHour}
                  disableSwap
                  onChange={(event, value) => {
                    if (!Array.isArray(value)) {
                      return;
                    }

                    const [startHour, endHour] = value;
                    const hours = endHour - startHour;

                    if (hours < MIN_HOURS || hours > MAX_HOURS) {
                      return;
                    }

                    field.onChange(value);
                  }}
                />
              )}
            />
          </FormRow>
        </FormRows>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.close}>Cancel</Button>
        <Button type="submit">Save</Button>
      </DialogActions>
    </FormContainer>
  );
}
