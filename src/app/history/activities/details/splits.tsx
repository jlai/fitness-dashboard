import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";
import { Fragment } from "react";
import { Box } from "@mui/material";
import { minBy } from "es-toolkit";

import { SplitDatum } from "@/utils/distances";
import { NumberFormats } from "@/utils/number-formats";
import { useUnits } from "@/config/units";

dayjs.extend(durationPlugin);

export function formatPace(durationMillis: number) {
  const durationSeconds = Math.floor(durationMillis / 1000);

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  return `${minutes}' ${NumberFormats.TWO_DIGITS.format(seconds)}"`;
}

export function formatTimeOffset(startTime: Date, time: Date) {
  return dayjs
    .duration(time.getTime() - startTime.getTime())
    .format("HH:mm:ss");
}

export function SplitsChart({ splits }: { splits: Array<SplitDatum> }) {
  const { localizedKilometers, localizedKilometersName } = useUnits();
  const bestPace = minBy(splits, ({ paceMillis }) => paceMillis).paceMillis;

  const activityStart = splits[0].startTime;

  return (
    <Box
      sx={{
        marginBlock: "16px",
        display: "grid",
        gridTemplateColumns:
          "max-content 1fr max-content max-content max-content",
        columnGap: "16px",
        rowGap: "8px",
      }}
    >
      <>
        <div>Split</div>
        <Box paddingInline="8px">Pace</Box>
        <div></div>
        <div>Distance</div>
        <div>Elapsed</div>
      </>
      {splits.map(
        ({ lap, incomplete, paceMillis, endTime, distanceCoveredMeters }) => (
          <Fragment key={lap}>
            <Box>{incomplete ? `${lap}*` : lap}</Box>
            <Box paddingInline="8px">
              <Box
                sx={{
                  bgcolor: "#02b2af",
                  height: "100%",
                  width: `${100 * (bestPace / paceMillis)}%`,
                  borderRadius: "8px",
                }}
              ></Box>
            </Box>
            <div>
              {formatPace(paceMillis)} / {localizedKilometersName}
            </div>
            <div className="text-end">
              {NumberFormats.FRACTION_DIGITS_2.format(
                localizedKilometers(distanceCoveredMeters / 1000)
              )}{" "}
              {localizedKilometersName}
            </div>
            <div>{formatTimeOffset(activityStart, endTime)}</div>
          </Fragment>
        )
      )}
    </Box>
  );
}
