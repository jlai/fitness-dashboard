import { BarRounded } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { useParentSize } from "@visx/responsive";

import { SleepLog } from "@/api/sleep";

export function SleepLevelMiniSummary({
  levels,
}: {
  levels: NonNullable<SleepLog["levels"]>;
}) {
  const { parentRef, width, height } = useParentSize();

  const summary = levels.summary;

  let totalMins = 0;
  let data: Array<{
    level: string;
    value: number;
    color: string;
  }> = [];

  if (summary.rem) {
    const wakeMins = summary.wake?.minutes ?? 0;
    const remMins = summary.rem?.minutes ?? 0;
    const lightMins = summary.light?.minutes ?? 0;
    const deepMins = summary.deep?.minutes ?? 0;
    totalMins = wakeMins + remMins + lightMins + deepMins;

    data = [
      {
        level: "wake",
        value: wakeMins,
        color: "#fcba03",
      },
      {
        level: "rem",
        value: remMins,
        color: "#9ccef0",
      },
      {
        level: "light",
        value: lightMins,
        color: "#0398fc",
      },
      {
        level: "deep",
        value: deepMins,
        color: "#5d47ff80",
      },
    ];
  } else {
    const awakeMins = summary.awake?.minutes ?? 0;
    const restlessMins = summary.restless?.minutes ?? 0;
    const asleepMins = summary.asleep?.minutes ?? 0;
    totalMins = awakeMins + restlessMins + asleepMins;

    data = [
      {
        level: "awake",
        value: awakeMins,
        color: "#fcba03",
      },
      {
        level: "restless",
        value: restlessMins,
        color: "#61dde8",
      },
      {
        level: "asleep",
        value: asleepMins,
        color: "#2850a1",
      },
    ];
  }

  const xScale = scaleLinear<number>({
    domain: [0, Math.max(totalMins, 10 * 60)], // 10 hours or total
    range: [0, width],
  });

  const bars: Array<React.ReactElement> = [];

  let xOffset = 0;
  for (const datum of data) {
    const width = xScale(datum.value)!;
    bars.push(
      <BarRounded
        key={datum.level}
        x={xOffset}
        y={0}
        width={width}
        height={height}
        radius={4}
        fill={datum.color}
        left={xOffset === 0}
        right={xOffset + width === xScale(totalMins)}
      />
    );
    xOffset += width;
  }

  return (
    <div ref={parentRef} className="size-full">
      <svg width={width} height={height}>
        {bars}
      </svg>
    </div>
  );
}
