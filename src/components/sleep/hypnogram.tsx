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

import { SleepLog, SleepLogLevelData } from "@/api/sleep";
import { formatSeconds, TIME } from "@/utils/date-formats";

import { LEVEL_COLORS, LEVEL_NAMES } from "./levels";

const levelIndex: Record<string, number> = {
  wake: 1,
  rem: 2,
  light: 3,
  deep: 4,
};

export function Hypnogram({
  sleepLog,
  height: containerHeight,
}: {
  sleepLog: SleepLog;
  height: number | string;
}) {
  const { parentRef, width, height } = useParentSize();
  const {
    showTooltip,
    tooltipOpen,
    hideTooltip,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<SleepLogLevelData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  const yAxisWidth = 70;
  const xAxisHeight = 40;

  const xScale = scaleTime<number>({
    domain: [new Date(sleepLog.startTime), new Date(sleepLog.endTime)],
    range: [yAxisWidth, width - yAxisWidth],
    round: true,
    nice: true,
  });

  const yScale = scaleBand({
    domain: ["wake", "rem", "light", "deep"],
    range: [0, height - xAxisHeight],
    padding: 1,
  });

  const handleMouseOver = (
    event: React.MouseEvent<SVGElement>,
    datum: SleepLogLevelData
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

  const data = sleepLog.levels?.data ?? [];
  const shortData = sleepLog.levels?.shortData ?? [];

  const lines: Array<React.ReactNode> = [];

  let lastEndX: number | undefined;
  let lastY: number | undefined;

  for (let i = 0; i < data.length; i++) {
    const datum = data[i];
    const startTime = dayjs(datum.dateTime);
    const endTime = startTime.add(datum.seconds, "seconds");
    const startX = xScale(startTime.toDate());
    const endX = xScale(endTime.toDate());
    const y = yScale(datum.level)!;

    const currentLevelIndex = levelIndex[datum.level];
    const prevLevelIndex = levelIndex[data[i - 1]?.level] ?? 0;
    const nextLevelIndex = levelIndex[data[i + 1]?.level] ?? 0;

    const startIsDeeper = currentLevelIndex > prevLevelIndex;
    const endIsDeeper = nextLevelIndex > currentLevelIndex;

    lines.push(
      <BarRounded
        key={datum.dateTime}
        fill={LEVEL_COLORS[datum.level]}
        radius={6}
        x={startX}
        y={y - 4}
        width={endX - startX}
        height={8}
        topLeft={!startIsDeeper}
        topRight={endIsDeeper}
        bottomLeft={startIsDeeper}
        bottomRight={!endIsDeeper}
        onMouseMove={(event) => handleMouseOver(event, datum)}
        onMouseOut={hideTooltip}
      />
    );

    if (lastEndX !== undefined && lastY !== undefined) {
      lines.push(
        <Line
          key={`${datum.dateTime}-join`}
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
    const datum = shortData[i];
    const startTime = dayjs(datum.dateTime);
    const endTime = startTime.add(datum.seconds, "seconds");
    const startX = xScale(startTime.toDate());
    const endX = xScale(endTime.toDate());
    const y = yScale(datum.level);

    lines.push(
      <Line
        key={`${datum.dateTime}-short`}
        stroke={LEVEL_COLORS[datum.level]}
        strokeWidth={8}
        from={{ x: startX, y }}
        to={{ x: endX, y }}
        onMouseMove={(event) => handleMouseOver(event, datum)}
        onMouseOut={hideTooltip}
      />
    );
  }

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
        <Group>{lines}</Group>
        <AxisLeft
          left={yAxisWidth}
          scale={yScale}
          stroke="#cbd5e1"
          strokeWidth={0}
          hideTicks
          tickFormat={(value) => LEVEL_NAMES[value]}
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
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          className="min-w-max z-[1500]"
        >
          <SleepSegmentTooltipContent tooltipData={tooltipData} />
        </TooltipInPortal>
      )}
    </div>
  );
}

function SleepSegmentTooltipContent({
  tooltipData: { level, seconds, dateTime },
}: {
  tooltipData: SleepLogLevelData;
}) {
  const startTime = new Date(dateTime);
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
        {TIME.format(startTime)} &ndash; {TIME.format(endTime)}
      </Typography>
    </div>
  );
}
