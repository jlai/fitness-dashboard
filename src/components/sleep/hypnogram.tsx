import { useParentSize } from "@visx/responsive";
import { LinearGradient } from "@visx/gradient";
import { Line } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleTime, scaleBand } from "@visx/scale";
import { ScaleTime } from "d3-scale";
import dayjs from "dayjs";

import { SleepLog } from "@/api/sleep";

export function Hypnogram({
  sleepLog,
  height: containerHeight,
}: {
  sleepLog: SleepLog;
  height: number | string;
}) {
  const { parentRef, width, height } = useParentSize();

  const yAxisWidth = 60;
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

  const colors: Record<string, string> = {
    wake: "#fcba03",
    rem: "#9ccef0",
    light: "#0398fc",
    deep: "#5d47ff",
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
    const y = yScale(datum.level);

    const width = endX - startX;
    const paddingX = width > 10 ? 4 : 0;

    lines.push(
      <Line
        key={datum.dateTime}
        stroke={colors[datum.level]}
        strokeWidth={8}
        strokeLinecap="round"
        radius={6}
        from={{ x: startX + paddingX, y }}
        to={{ x: endX - paddingX, y }}
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
        stroke={colors[datum.level]}
        strokeWidth={8}
        from={{ x: startX, y }}
        to={{ x: endX, y }}
      />
    );
  }

  return (
    <div ref={parentRef} style={{ height: containerHeight }}>
      <svg width={width} height={height}>
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
        <Group left={yAxisWidth}>{lines}</Group>
        <AxisLeft
          left={yAxisWidth}
          scale={yScale}
          stroke="#cbd5e1"
          strokeWidth={0}
          hideTicks
          tickLabelProps={{ fill: "#cbd5e1", fontSize: 14 }}
        />
        <AxisBottom<ScaleTime<number, number>>
          left={0}
          top={height - xAxisHeight}
          scale={xScale}
          stroke="#cbd5e1"
          strokeWidth={0}
          tickStroke="#cbd5e1"
          tickLineProps={{ strokeWidth: 1 }}
          tickLabelProps={{ fill: "#cbd5e1", fontSize: 14 }}
        />
      </svg>
    </div>
  );
}
