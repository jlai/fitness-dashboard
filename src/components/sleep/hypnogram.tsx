import { useParentSize } from "@visx/responsive";
import { LinearGradient } from "@visx/gradient";
import { Line, BarRounded } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { scaleTime, scaleBand } from "@visx/scale";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { ScaleTime } from "d3-scale";
import dayjs from "dayjs";
import { Box, Stack, Typography } from "@mui/material";

import type { Sleep, SleepStage } from "@generated/orval/fetch/google-health-api/models";

import {
  getSleepEndTime,
  getSleepStartTime,
  stageDurationSeconds,
  stageLevelKey,
  usesStagesLayout,
} from "@/api/sleep/helpers";
import { formatSeconds } from "@/utils/duration-formats";
import { DateFormats } from "@/utils/date-formats";

import { LEVEL_COLORS, LEVEL_NAMES } from "./levels";

const levelIndex: Record<string, number> = {
  wake: 1,
  rem: 2,
  light: 3,
  deep: 4,

  awake: 1,
  restless: 2,
  asleep: 3,
};

interface HypnogramProps {
  sleep: Sleep;
  height: number | string;
}

interface SleepLevelPlotProps {
  data: SleepStage[];
  shortData: readonly SleepStage[];
  sleep: Sleep;
  xScale: ScaleTime<number, number>;
  yScale: ReturnType<typeof scaleBand<string>>;
  height: number;
  onMouseOver: (
    event: React.MouseEvent<SVGElement>,
    datum: SleepStage
  ) => void;
  onMouseOut: () => void;
}

interface HypnogramAxesProps {
  xScale: ScaleTime<number, number>;
  yScale: ReturnType<typeof scaleBand<string>>;
  width: number;
  height: number;
  yAxisWidth: number;
  xAxisHeight: number;
}

interface SleepSegmentTooltipContentProps {
  sleep: Sleep;
  tooltipData: SleepStage;
}

function SleepLevelPlot({
  data,
  shortData,
  sleep,
  xScale,
  yScale,
  height,
  onMouseOver,
  onMouseOut,
}: SleepLevelPlotProps) {
  const lines: Array<React.ReactNode> = [];
  const rects: Array<React.ReactNode> = [];

  let lastEndX: number | undefined;
  let lastY: number | undefined;

  for (let i = 0; i < data.length; i++) {
    const stage = data[i];
    const level = stageLevelKey(stage.type, sleep);
    const startTime = dayjs(stage.startTime);
    const endTime = startTime.add(stageDurationSeconds(stage), "seconds");
    const startX = xScale(startTime.toDate().getTime());
    const endX = xScale(endTime.toDate().getTime());
    const y = yScale(level)!;

    const currentLevelIndex = levelIndex[level];
    const prevLevel = stageLevelKey(data[i - 1]?.type, sleep);
    const nextLevel = stageLevelKey(data[i + 1]?.type, sleep);
    const prevLevelIndex = levelIndex[prevLevel] ?? 0;
    const nextLevelIndex = levelIndex[nextLevel] ?? 0;

    const startIsDeeper = currentLevelIndex > prevLevelIndex;
    const endIsDeeper = nextLevelIndex > currentLevelIndex;

    lines.push(
      <BarRounded
        key={stage.startTime}
        fill={LEVEL_COLORS[level]}
        radius={6}
        x={startX}
        y={y - 4}
        width={endX - startX}
        height={8}
        topLeft={!startIsDeeper}
        topRight={endIsDeeper}
        bottomLeft={startIsDeeper}
        bottomRight={!endIsDeeper}
        onMouseMove={(event) => onMouseOver(event, stage)}
        onMouseOut={onMouseOut}
      />
    );

    rects.push(
      <rect
        key={`rect-${stage.startTime}`}
        x={startX}
        width={endX - startX}
        y={0}
        height={height}
        fill="transparent"
        onMouseMove={(event) => onMouseOver(event, stage)}
        onMouseOut={onMouseOut}
      />
    );

    if (lastEndX !== undefined && lastY !== undefined) {
      lines.push(
        <Line
          key={`${stage.startTime}-join`}
          from={{ x: lastEndX, y: lastY }}
          to={{ x: startX, y }}
          stroke="rgb(195, 206, 224, 0.3)"
          strokeWidth={1}
        />
      );
    }

    lastEndX = endX;
    lastY = y;
  }

  for (let i = 0; i < shortData.length; i++) {
    const stage = shortData[i];
    const level = stageLevelKey(stage.type, sleep);
    const startTime = dayjs(stage.startTime);
    const endTime = startTime.add(stageDurationSeconds(stage), "seconds");
    const startX = xScale(startTime.toDate());
    const endX = xScale(endTime.toDate());
    const y = yScale(level);

    lines.push(
      <Line
        key={`${stage.startTime}-short`}
        stroke={LEVEL_COLORS[level]}
        strokeWidth={8}
        from={{ x: startX, y }}
        to={{ x: endX, y }}
        onMouseMove={(event) => onMouseOver(event, stage)}
        onMouseOut={onMouseOut}
      />
    );
  }

  return (
    <>
      <Group>{rects}</Group>
      <Group>{lines}</Group>
    </>
  );
}

function HypnogramAxes({
  xScale,
  yScale,
  width,
  height,
  yAxisWidth,
  xAxisHeight,
}: HypnogramAxesProps) {
  return (
    <>
      <AxisLeft
        left={yAxisWidth}
        scale={yScale}
        stroke="#cbd5e1"
        strokeWidth={0}
        hideTicks
        tickFormat={(value: string) => LEVEL_NAMES[value]}
        tickLabelProps={{ fill: "#cbd5e1", fontSize: 14 }}
      />
      <AxisBottom<ScaleTime<number, number>>
        left={0}
        top={height - xAxisHeight}
        scale={xScale}
        stroke="#cbd5e1"
        strokeWidth={0}
        numTicks={width > 500 ? undefined : 4}
        tickStroke="#cbd5e1"
        tickLineProps={{ strokeWidth: 1 }}
        tickLabelProps={{ fill: "#cbd5e1", fontSize: 14 }}
      />
    </>
  );
}

function SleepSegmentTooltipContent({
  sleep,
  tooltipData: stage,
}: SleepSegmentTooltipContentProps) {
  const level = stageLevelKey(stage.type, sleep);
  const seconds = stageDurationSeconds(stage);
  const startTime = new Date(stage.startTime ?? "");
  const endTime = new Date(startTime.getTime() + seconds * 1000);

  return (
    <div className="space-y-1">
      <Stack direction="row" alignItems="center" columnGap={1}>
        <Box width="1em" height="1em" bgcolor={LEVEL_COLORS[level]}></Box>
        <Typography>
          {LEVEL_NAMES[level]}: <b>{formatSeconds(seconds)}</b>
        </Typography>
      </Stack>
      <Typography>
        {DateFormats.TIME.format(startTime)} &ndash;{" "}
        {DateFormats.TIME.format(endTime)}
      </Typography>
    </div>
  );
}

export function Hypnogram({ sleep, height: containerHeight }: HypnogramProps) {
  const { parentRef, width, height } = useParentSize();
  const {
    showTooltip,
    tooltipOpen,
    hideTooltip,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<SleepStage>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  const yAxisWidth = 70;
  const xAxisHeight = 40;

  const xScale = scaleTime<number>({
    domain: [
      new Date(getSleepStartTime(sleep)).getTime(),
      new Date(getSleepEndTime(sleep)).getTime(),
    ],
    range: [yAxisWidth, Math.max(yAxisWidth, width - yAxisWidth)],
    round: true,
    nice: true,
  });

  const yScale = scaleBand({
    domain: usesStagesLayout(sleep)
      ? ["wake", "rem", "light", "deep"]
      : ["awake", "restless", "asleep"],
    range: [0, height - xAxisHeight],
    padding: 1,
  });

  const handleMouseOver = (
    event: React.MouseEvent<SVGElement>,
    datum: SleepStage
  ) => {
    const coords = localPoint((event.target as any).ownerSVGElement, event);
    if (!coords) {
      return;
    }

    showTooltip({
      tooltipLeft: coords.x,
      tooltipTop: coords.y,
      tooltipData: datum,
    });
  };

  const data = sleep.stages ?? [];
  const shortData = sleep.shortAwakenings ?? [];

  return (
    <div
      ref={parentRef}
      className="relative"
      style={{ height: containerHeight }}
    >
      <svg ref={containerRef} width={width} height={height}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="url(#area-background-gradient)"
          rx={14}
        />
        <LinearGradient
          id="area-background-gradient"
          from="#3b6978"
          to="#204051"
        />
        <SleepLevelPlot
          data={data}
          shortData={shortData}
          sleep={sleep}
          xScale={xScale}
          yScale={yScale}
          height={height}
          onMouseOver={handleMouseOver}
          onMouseOut={hideTooltip}
        />
        <HypnogramAxes
          xScale={xScale}
          yScale={yScale}
          width={width}
          height={height}
          yAxisWidth={yAxisWidth}
          xAxisHeight={xAxisHeight}
        />
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          className="min-w-max z-[1500]"
        >
          <SleepSegmentTooltipContent sleep={sleep} tooltipData={tooltipData} />
        </TooltipInPortal>
      )}
    </div>
  );
}
