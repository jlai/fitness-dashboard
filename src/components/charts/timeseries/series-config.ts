import { createContext, useContext } from "react";

import { StringValueDatum, TimeSeriesDatum } from "./data";

export interface ChartSeriesConfig<TDatum> {
  id: string;
  yAccessor: (d: TDatum) => number | null;
  label: string;
  color?: string;
  numberFormat?: (value: number) => string;
  unit?: string;
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

export const SeriesConfigsContext = createContext<
  Array<ChartSeriesConfig<any>>
>([]);

export function useSeriesConfigs<DatumType extends TimeSeriesDatum>() {
  return useContext(SeriesConfigsContext) as Array<
    ChartSeriesConfig<DatumType>
  >;
}
