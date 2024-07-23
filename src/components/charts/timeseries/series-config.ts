import { CurveType } from "@mui/x-charts";

import { StringValueDatum } from "./data";

export interface ChartSeriesConfig<TDatum> {
  id: string;
  yAccessor: (d: TDatum) => number | null;
  label: string;
  color?: string;
  numberFormat?: (value: number) => string;
  unit?: string;
  showMark?: boolean;
  curve?: CurveType;
}

export function singleSeriesConfig<TDatum = StringValueDatum>({
  id,
  yAccessor,
  label,
  ...rest
}: Partial<ChartSeriesConfig<TDatum>>) {
  return [
    {
      ...rest,
      id: id ?? "default",
      label,
      yAccessor:
        yAccessor ?? ((entry) => Number((entry as StringValueDatum).value)),
    },
  ] as Array<ChartSeriesConfig<TDatum>>;
}
