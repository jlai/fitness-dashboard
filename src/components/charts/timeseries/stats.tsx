import { useContext } from "react";
import { createPortal } from "react-dom";
import { Typography } from "@mui/material";

import { FRACTION_DIGITS_0 } from "@/utils/number-formats";

import { TimeSeriesChartContext } from "./context";
import { TimeSeriesDatum } from "./data";

export function GraphStats({ children }: { children: React.ReactNode }) {
  const context = useContext(TimeSeriesChartContext);

  return context.statsEl ? createPortal(children, context.statsEl) : undefined;
}

export function Stat({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function AverageAndTotalStat<TDatum extends TimeSeriesDatum>({
  data,
  yAccessor,
  valueFormatter = FRACTION_DIGITS_0.format,
}: {
  data?: Array<TDatum>;
  yAccessor: (d: TDatum) => number | null;
  valueFormatter?: (value: number) => string;
}) {
  const {
    range: { startDay, endDay },
  } = useContext(TimeSeriesChartContext);
  const numDays = endDay.diff(startDay, "days");

  if (!data) {
    return;
  }

  let total = 0;
  let count = 0;

  for (const datum of data) {
    const value = yAccessor(datum);
    if (value !== null) {
      count++;
      total += value;
    }
  }

  return (
    <>
      <Stat>
        <Typography variant="subtitle2" component="span">
          Daily average: {valueFormatter(total / count)}
        </Typography>
      </Stat>
      <Stat>
        <Typography variant="subtitle2" component="span">
          {numDays}-day total: {valueFormatter(total)}
        </Typography>
      </Stat>
    </>
  );
}
