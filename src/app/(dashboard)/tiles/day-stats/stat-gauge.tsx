import {
  GaugeContainer,
  GaugeReferenceArc,
  GaugeValueArc,
} from "@mui/x-charts";
import Image from "next/image";
import { Stack, Typography, useTheme } from "@mui/material";

import NumericStat from "@/components/numeric-stat";
import { NumberFormats } from "@/utils/number-formats";

export default function StatGauge({
  value,
  valueMax,
  valueUnits,
  iconSrc,
  innerContent,
  bottomContent,
  ariaLabel,
  muted = false,
}: {
  /** numeric value; this should use localized values for screen reader support */
  value: number;
  valueMax?: number;
  valueUnits: string;
  iconSrc?: string;
  innerContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  ariaLabel?: string;
  /** Grey ring with no progress, used when a goal is not set. */
  muted?: boolean;
}) {
  const theme = useTheme();
  const showGoalRing = !muted && valueMax != null && valueMax > 0;
  const showRing = showGoalRing || muted;
  const percent = showGoalRing ? (100 * value) / valueMax : 0;

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
          {showRing ? (
            <GaugeContainer
              startAngle={-180}
              endAngle={180}
              value={muted ? null : value}
              valueMax={muted ? 1 : valueMax}
              cornerRadius="50%"
              aria-label={
                muted ? "No goal set" : (ariaLabel ?? `${valueUnits} progress`)
              }
              aria-valuetext={muted ? "No goal set" : undefined}
            >
              <GaugeReferenceArc
                style={
                  muted
                    ? {
                        fill:
                          theme.palette.mode === "dark"
                            ? theme.palette.grey[600]
                            : theme.palette.grey[400],
                      }
                    : undefined
                }
              />
              {showGoalRing && <GaugeValueArc style={{ fill: color }} />}
            </GaugeContainer>
          ) : (
            <div className="size-full" aria-label={ariaLabel ?? valueUnits} />
          )}
          <div className="absolute inset-1/4 flex place-content-center">
            {showRing ? innerContent : undefined}
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

export function StatPercent({ ratio }: { ratio?: number }) {
  if (ratio == null || !Number.isFinite(ratio)) {
    return (
      <Stack direction="column" alignItems="center" justifyContent="center">
        <Typography variant="h5" color="text.disabled">
          —
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="column" alignItems="center" justifyContent="center">
      <Typography variant="h5">
        {NumberFormats.PERCENT_FRACTION_DIGITS_0.format(ratio)}
      </Typography>
    </Stack>
  );
}
