import { BarRounded } from "@visx/shape";
import { useParentSize } from "@visx/responsive";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { Text } from "@visx/text";
import { max } from "lodash";

import { SleepLog } from "@/api/sleep";
import { formatMinutes } from "@/utils/date-formats";
import { PERCENT_FRACTION_DIGITS_0 } from "@/utils/number-formats";

export function SleepLevelSummaryChart({
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

  const margin = {
    left: 60,
    right: 100,
    bottom: 30,
  };

  const xScale = scaleLinear({
    domain: [0, max([wakeMins, remMins, lightMins, deepMins])!],
    range: [margin.left, width - margin.left - margin.right],
  });

  const yScale = scaleBand({
    domain: ["wake", "rem", "light", "deep"],
    range: [0, height - margin.bottom],
  });

  const data = [
    {
      level: "wake",
      value: wakeMins,
      color: "#fcba03",
      ratio: wakeMins / totalMins,
    },
    {
      level: "rem",
      value: remMins,
      color: "#9ccef0",
      ratio: remMins / totalMins,
    },
    {
      level: "light",
      value: lightMins,
      color: "#0398fc",
      ratio: lightMins / totalMins,
    },
    {
      level: "deep",
      value: deepMins,
      color: "#5d47ff80",
      ratio: deepMins / totalMins,
    },
  ];

  const barHeight = (height - margin.bottom) / 5;

  return (
    <div ref={parentRef} className="h-full">
      <svg width={width} height={height}>
        <AxisLeft
          left={margin.left}
          scale={yScale}
          hideTicks
          hideAxisLine
          tickLabelProps={{ fill: "currentColor", fontSize: 14 }}
        />
        {data.map((datum) => {
          const barWidth = xScale(datum.value);
          const canFitPercent = barWidth > 24;

          return (
            <Group
              key={datum.level}
              left={margin.left}
              top={yScale(datum.level)!}
            >
              <BarRounded
                orientation="horizontal"
                x={0}
                y={4}
                width={barWidth}
                height={barHeight}
                fill={datum.color}
                right
                radius={8}
              />
              {canFitPercent && (
                <Text
                  textAnchor="start"
                  verticalAnchor="middle"
                  x={10}
                  y={barHeight / 2 + 4}
                  fontSize={14}
                  fontWeight={500}
                >
                  {PERCENT_FRACTION_DIGITS_0.format(datum.ratio)}
                </Text>
              )}
              <Text
                textAnchor="start"
                verticalAnchor="middle"
                x={barWidth + 18}
                y={barHeight / 2 + 4}
                fontSize={14}
                fontWeight={500}
              >
                {canFitPercent
                  ? formatMinutes(datum.value)
                  : `${formatMinutes(
                      datum.value
                    )} (${PERCENT_FRACTION_DIGITS_0.format(datum.ratio)})`}
              </Text>
            </Group>
          );
        })}
      </svg>
    </div>
  );
}
