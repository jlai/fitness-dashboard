import { BarRounded } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { useParentSize } from "@visx/responsive";
import { Box, Tooltip, Typography } from "@mui/material";

import { SleepLog } from "@/api/sleep";
import { formatMinutes } from "@/utils/date-formats";
import { PERCENT_FRACTION_DIGITS_0 } from "@/utils/number-formats";

import { FlexSpacer } from "../layout/flex";

import { LEVEL_NAMES } from "./levels";

interface SleepSegmentDatum {
  level: string;
  value: number;
  color: string;
  ratio: number;
}

export function SleepLevelMiniSummary({
  levels,
}: {
  levels: NonNullable<SleepLog["levels"]>;
}) {
  const { parentRef, width, height } = useParentSize();

  const summary = levels.summary;

  let totalMins = 0;
  let data: Array<SleepSegmentDatum> = [];

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
    ].toReversed();
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
        ratio: awakeMins / totalMins,
      },
      {
        level: "restless",
        value: restlessMins,
        color: "#61dde8",
        ratio: restlessMins / totalMins,
      },
      {
        level: "asleep",
        value: asleepMins,
        color: "#2850a1",
        ratio: asleepMins / totalMins,
      },
    ].toReversed();
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
        right={xScale(totalMins) - xOffset - width < 2}
      />
    );
    xOffset += width;
  }

  return (
    <Tooltip
      title={
        <>
          {data
            .filter((datum) => datum.value > 0)
            .map((datum) => (
              <Typography
                key={datum.level}
                variant="body1"
                className="m-1 text-end flex flex-row items-center"
                columnGap={1}
              >
                <Box width="1em" height="1em" bgcolor={datum.color}></Box>
                <div>{LEVEL_NAMES[datum.level]}</div>
                <FlexSpacer />
                <b className="text-end">{formatMinutes(datum.value)}</b>
                <div className="text-end">
                  ({PERCENT_FRACTION_DIGITS_0.format(datum.ratio)})
                </div>
              </Typography>
            ))}
        </>
      }
    >
      <div ref={parentRef} className="relative size-full">
        <svg width={width} height={height}>
          {bars}
        </svg>
      </div>
    </Tooltip>
  );
}
