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

  const wakeMins = summary.wake?.minutes ?? 0;
  const remMins = summary.rem?.minutes ?? 0;
  const lightMins = summary.light?.minutes ?? 0;
  const deepMins = summary.deep?.minutes ?? 0;
  const totalMins = wakeMins + remMins + lightMins + deepMins;

  const xScale = scaleLinear<number>({
    domain: [0, Math.max(totalMins, 10 * 60)], // 10 hours or total
    range: [0, width],
  });

  const data = [
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

  const bars: Array<React.ReactNode> = [];

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
        radius={2}
        fill={datum.color}
        left={datum.level == "wake"}
        right={datum.level == "deep"}
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
