import { Typography } from "@mui/material";

import { NumberFormats } from "@/utils/number-formats";

export default function NumericStat({
  value,
  unit,
  maximumFractionDigits = 0,
  className = "",
}: {
  value: number | undefined;
  unit?: string;
  maximumFractionDigits?: number;
  className?: string;
}) {
  const formatter = new Intl.NumberFormat(NumberFormats.locale, {
    maximumFractionDigits,
  });

  return (
    <div className={`${className} text-center`}>
      <Typography variant="subtitle1" component="span" className="text-lg">
        {value !== undefined ? formatter.format(value) : "\u2014"}
      </Typography>{" "}
      {unit && (
        <Typography variant="body2" component="span" className="text-base">
          {unit}
        </Typography>
      )}
    </div>
  );
}
