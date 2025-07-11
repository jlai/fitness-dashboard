import { BarRounded } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { useParentSize } from "@visx/responsive";
import { Box, Paper, Popper, Typography } from "@mui/material";
import React from "react";
import {
  bindHover,
  bindPopper,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { sum } from "es-toolkit";

import { SleepLog } from "@/api/sleep";
import { formatMinutes } from "@/utils/duration-formats";
import { NumberFormats } from "@/utils/number-formats";

import { FlexSpacer } from "../layout/flex";

import { getLevelSummary, LEVEL_NAMES, SleepSummaryDatum } from "./levels";

export function SleepLevelMiniSummary({
  levels,
}: {
  levels: NonNullable<SleepLog["levels"]>;
}) {
  const { parentRef, width, height } = useParentSize();
  const popupState = usePopupState({
    variant: "popper",
    popupId: "sleep-mini-summary",
  });

  let data = getLevelSummary(levels).toReversed();
  let totalMins = sum(data.map((datum) => datum.value));

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
    <>
      <div
        ref={parentRef}
        className="relative size-full"
        {...bindHover(popupState)}
      >
        <svg width={width} height={height}>
          {bars}
        </svg>
      </div>
      {popupState.isOpen && (
        <Popper {...bindPopper(popupState)}>
          <Paper className="p-2">
            <SleepStagesTooltip data={data} />
          </Paper>
        </Popper>
      )}
    </>
  );
}

function SleepStagesTooltip({ data }: { data: Array<SleepSummaryDatum> }) {
  return (
    <>
      {data
        .filter((datum) => datum.value > 0)
        .map((datum) => (
          <Typography
            key={datum.level}
            variant="body1"
            component="div"
            className="m-1 text-end flex flex-row items-center"
            columnGap={1}
          >
            <Box width="1em" height="1em" bgcolor={datum.color}></Box>
            <div>
              {LEVEL_NAMES[datum.level]}{" "}
              {datum?.count ? <>({datum.count}x)</> : undefined}
            </div>
            <FlexSpacer />
            <b className="text-end">{formatMinutes(datum.value)}</b>
            <div className="text-end">
              ({NumberFormats.PERCENT_FRACTION_DIGITS_0.format(datum.ratio)})
            </div>
          </Typography>
        ))}
    </>
  );
}
