import {
  GaugeContainer,
  GaugeReferenceArc,
  GaugeValueArc,
} from "@mui/x-charts";
import Image from "next/image";
import { Stack, Typography } from "@mui/material";

import NumericStat from "@/components/numeric-stat";
import { PERCENT_FRACTION_DIGITS_0 } from "@/utils/number-formats";

export default function StatGauge({
  value,
  valueMax,
  valueUnits,
  iconSrc,
  innerContent,
  bottomContent,
}: {
  /** numeric value; this should use localized values for screen reader support */
  value: number;
  valueMax: number;
  valueUnits: string;
  iconSrc?: string;
  innerContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}) {
  const percent = (100 * value) / valueMax;

  let color;

  if (percent > 99) {
    color = "#90ee02";
  } else if (percent > 65) {
    color = "#ee6002";
  } else {
    color = "#ff9e22";
  }

  return (
    <div className="size-full max-h-full p-2">
      <div className="size-full w-full max-h-full flex flex-col items-center">
        <div className="w-full flex-1 relative min-h-0">
          <GaugeContainer
            startAngle={-180}
            endAngle={180}
            value={value}
            valueMax={valueMax}
            cornerRadius="50%"
          >
            <GaugeReferenceArc />
            <GaugeValueArc style={{ fill: color }} />
          </GaugeContainer>
          <div className="absolute inset-1/4 flex place-content-center">
            {innerContent}
            {iconSrc && (
              <Image src={iconSrc} alt="" className="size-3/4 self-center" />
            )}
          </div>
        </div>
        {bottomContent ?? (
          <NumericStat
            value={value}
            unit={valueUnits}
            maximumFractionDigits={2}
          />
        )}
      </div>
    </div>
  );
}

export function StatPercent({ ratio }: { ratio: number }) {
  return (
    <Stack direction="column" alignItems="center" justifyContent="center">
      <Typography variant="h5">
        {PERCENT_FRACTION_DIGITS_0.format(ratio)}
      </Typography>
    </Stack>
  );
}
