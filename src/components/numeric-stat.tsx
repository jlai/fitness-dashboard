import { Typography } from "@mui/material";

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
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  });

  return (
    <div className={`${className}`}>
      <Typography
        variant="subtitle1"
        component="span"
        className="text-lg text-center"
      >
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
